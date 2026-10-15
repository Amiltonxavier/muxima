import { type ParsedMail, simpleParser } from "mailparser";
import { SMTPServer, type SMTPServerSession } from "smtp-server";

/**
 * In-process SMTP server used as the recipient's mailbox in tests.
 *
 * It speaks just enough SMTP (EHLO / MAIL FROM / RCPT TO / DATA / QUIT — no
 * STARTTLS, no AUTH) for the real Nodemailer transport to deliver a message,
 * captures every message and parses it with `mailparser`, so a test can assert
 * the *received* message — not the arguments handed to a double.
 *
 * This is what makes "the e-mail was dispatched and arrived in the mailbox" a
 * real assertion: `MailService` → `deliverMail` → Nodemailer → TCP → here.
 */

/** One delivered message, in envelope and parsed forms. */
export type CapturedMail = {
	/** Envelope `MAIL FROM` (bare address). */
	from: string;
	/** Envelope `RCPT TO` recipients (bare addresses). */
	to: string[];
	/** Raw RFC 5322 source, exactly as it crossed the wire. */
	raw: string;
	/** Decoded headers + bodies (quoted-printable / base64 / RFC 2047). */
	parsed: ParsedMail;
};

export type Mailbox = {
	/** Ephemeral TCP port the SMTP server is listening on. */
	port: number;
	/** All messages received so far, in arrival order. */
	messages: CapturedMail[];
	/** Resolves once at least `count` messages have been received. */
	waitFor: (count: number, timeoutMs?: number) => Promise<void>;
	/** Stops the server (already-received messages stay readable). */
	close: () => Promise<void>;
};

function addressOf(value: unknown): string {
	if (typeof value === "string") return value;
	if (value && typeof value === "object" && "address" in value) {
		const address = (value as { address?: unknown }).address;
		return typeof address === "string" ? address : "";
	}
	return "";
}

export async function startMailbox(): Promise<Mailbox> {
	const messages: CapturedMail[] = [];
	const waiters: { count: number; resolve: () => void }[] = [];

	const server = new SMTPServer({
		authOptional: true,
		disabledCommands: ["STARTTLS", "AUTH"],
		hideSTARTTLS: true,
		logger: false,
		onData(stream, session: SMTPServerSession, callback) {
			const chunks: Buffer[] = [];
			stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
			stream.on("end", async () => {
				const raw = Buffer.concat(chunks).toString("utf8");
				const parsed = await simpleParser(raw);
				messages.push({
					from: addressOf(session.envelope.mailFrom),
					to: session.envelope.rcptTo.map((rcpt) => addressOf(rcpt)),
					raw,
					parsed,
				});
				for (const waiter of waiters) {
					if (messages.length >= waiter.count) waiter.resolve();
				}
				callback();
			});
			stream.on("error", () => callback(new Error("stream error")));
		},
	});

	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const bound = server.server.address();
	const port = typeof bound === "object" && bound !== null ? bound.port : 0;

	return {
		port,
		messages,
		waitFor(count, timeoutMs = 5_000) {
			if (messages.length >= count) return Promise.resolve();
			return new Promise<void>((resolve, reject) => {
				const timer = setTimeout(() => {
					reject(
						new Error(
							`Mailbox timeout: esperadas ${count} mensagens, recebidas ${messages.length}`,
						),
					);
				}, timeoutMs);
				waiters.push({
					count,
					resolve: () => {
						clearTimeout(timer);
						resolve();
					},
				});
			});
		},
		close() {
			return new Promise<void>((resolve) => {
				server.close(() => resolve());
			});
		},
	};
}
