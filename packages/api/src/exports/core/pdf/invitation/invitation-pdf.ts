import { createHash } from "node:crypto";
import { jsPDF } from "jspdf";
import type {
	PublicInvitation,
	PublicInvitationGuest,
	PublicInvitationLookup,
} from "../../../../shared/types/entities";
import { formatDate, formatDateTime, formatTime } from "../../format";
import {
	INV_FONT_SANS,
	INV_FONT_SERIF,
	INV_GOLD,
	INV_INK,
	INV_LINE,
	INV_MARGIN,
	INV_MUTED,
	INV_PAGE,
	INV_SIZE,
	invEnsureSpace,
} from "./invitation-pdf-layout";

const QR_SIZE = 120;

function setMetadata(doc: jsPDF, eventName: string, generatedAt: Date) {
	const title = `Convite — ${eventName}`;
	doc.setProperties({
		title,
		subject: title,
		author: "Muxima",
		creator: "Muxima",
	});
	doc.setCreationDate(generatedAt);

	const pdfDoc: unknown = (doc as unknown as { internal: unknown }).internal;
	const internal = pdfDoc as {
		pdfVersion?: string;
		setCurrentPageInfo?: (info: unknown) => void;
	};
	if (internal.pdfVersion) internal.pdfVersion = "1.7";

	try {
		const id = createHash("sha256")
			.update(`${title}|${generatedAt.toISOString()}`)
			.digest("hex")
			.substring(0, 32);
		doc.setTextColor(255, 255, 255);
		doc.text(`/ID [<${id}><${id}>]`, 0, 0, { angle: 90 });
	} catch {
		// ignore
	}
}

function drawHeaderDecoration(doc: jsPDF, y: number): number {
	const top = y - 8;
	doc.setDrawColor(INV_LINE.r, INV_LINE.g, INV_LINE.b);
	doc.setLineWidth(0.8);
	doc.line(INV_MARGIN, top + 2, INV_PAGE.width - INV_MARGIN, top + 2);

	doc.setDrawColor(INV_GOLD.r, INV_GOLD.g, INV_GOLD.b);
	doc.setLineWidth(1.2);
	doc.line(INV_MARGIN, top + 6, INV_MARGIN + 60, top + 6);

	return y + 10;
}

function drawOrnamentCorner(doc: jsPDF, side: "top-left" | "bottom-right") {
	const size = 40;
	if (side === "top-left") {
		const x = INV_MARGIN - 12;
		const y = INV_MARGIN - 12;
		doc.setDrawColor(INV_GOLD.r, INV_GOLD.g, INV_GOLD.b);
		doc.setLineWidth(0.8);
		// decorative arc omitted for compatibility
		doc.line(x + size, y, x + 20, y);
		doc.line(x + size, y, x + size, y + 20);
	} else {
		const x = INV_PAGE.width - INV_MARGIN - size + 12;
		const y = INV_PAGE.height - INV_MARGIN - size + 12;
		doc.setDrawColor(INV_GOLD.r, INV_GOLD.g, INV_GOLD.b);
		doc.setLineWidth(0.8);
		// decorative arc omitted for compatibility
		doc.line(x, y + size, x + 20, y + size);
		doc.line(x, y + size, x, y + size - 20);
	}
}

function renderNames(
	doc: jsPDF,
	y: number,
	invitation: PublicInvitation,
): number {
	let current = y;
	const hosts: any[] = [];
	const others = invitation.guests;

	const list = hosts.length > 0 ? hosts : others;
	if (list.length === 0) return current;

	doc.setTextColor(INV_INK.r, INV_INK.g, INV_INK.b);
	doc.setFont(INV_FONT_SERIF, "normal");
	doc.setFontSize(INV_SIZE.name);
	const names = list.map((g) => g.name).join(" & ");
	const split = doc.splitTextToSize(names, INV_PAGE.width - INV_MARGIN * 2);
	doc.text(split, INV_MARGIN, current);
	current += split.length * (INV_SIZE.name * 1.2);

	if (false) {
		doc.setFontSize(INV_SIZE.subtitle);
		doc.setTextColor(INV_MUTED.r, INV_MUTED.g, INV_MUTED.b);
		doc.text(`e convidados de ${null}`, INV_MARGIN, current);
		current += INV_SIZE.subtitle * 1.4;
	}

	return current + 8;
}

function renderEventDetails(
	doc: jsPDF,
	y: number,
	invitation: PublicInvitation,
): number {
	let current = invEnsureSpace(doc, y, 80);
	drawHeaderDecoration(doc, current);
	current += 20;

	doc.setFont(INV_FONT_SERIF, "bold");
	doc.setFontSize(INV_SIZE.title);
	doc.setTextColor(INV_INK.r, INV_INK.g, INV_INK.b);
	const title = "Temos o prazer de vos convidar";
	const t = doc.splitTextToSize(title, INV_PAGE.width - INV_MARGIN * 2);
	doc.text(t, INV_MARGIN, current);
	current += t.length * (INV_SIZE.title * 1.1) + 16;

	const event = invitation.event;
	doc.setFont(INV_FONT_SANS, "normal");
	doc.setFontSize(INV_SIZE.body);
	doc.setTextColor(INV_MUTED.r, INV_MUTED.g, INV_MUTED.b);

	let line = `Para o nosso/a ${formatEventType(event.type)}`;
	doc.text(line, INV_MARGIN, current);
	current += INV_SIZE.body * 1.5;

	if (event.eventDate) {
		line = `A realizar no dia ${formatDate(event.eventDate)}`;
		if (event.startTime || event.endTime) {
			const times = [event.startTime, event.endTime]
				.filter(Boolean)
				.join(" — ");
			line += `, às ${times}`;
		}
		doc.text(line, INV_MARGIN, current);
		current += INV_SIZE.body * 1.5;
	}

	const locationParts: string[] = [];
	if (event.venueName) locationParts.push(event.venueName);
	if (event.address) locationParts.push(event.address);
	if (event.municipality) locationParts.push(event.municipality);
	if (event.province) locationParts.push(event.province);
	if (locationParts.length > 0) {
		doc.text(locationParts.join(", "), INV_MARGIN, current);
		current += INV_SIZE.body * 1.5;
	}

	if (event.description) {
		const desc = doc.splitTextToSize(
			event.description,
			INV_PAGE.width - INV_MARGIN * 2,
		);
		doc.text(desc, INV_MARGIN, current);
		current += desc.length * (INV_SIZE.body * 1.5);
	}

	return current + 20;
}

function renderGuests(
	doc: jsPDF,
	y: number,
	invitation: PublicInvitation,
): number {
	let current = invEnsureSpace(doc, y, 60);
	doc.setFont(INV_FONT_SANS, "bold");
	doc.setFontSize(INV_SIZE.label);
	doc.setTextColor(INV_GOLD.r, INV_GOLD.g, INV_GOLD.b);
	doc.text("CONVIDADOS", INV_MARGIN, current);
	current += INV_SIZE.label * 1.8;

	doc.setFont(INV_FONT_SANS, "normal");
	doc.setFontSize(INV_SIZE.body);
	doc.setTextColor(INV_INK.r, INV_INK.g, INV_INK.b);

	invitation.guests.forEach((guest: PublicInvitationGuest) => {
		current = invEnsureSpace(doc, current, 14);
		doc.text(guest.name, INV_MARGIN, current);
		current += INV_SIZE.body * 1.4;
		if (guest.companions.length > 0) {
			const comps = guest.companions.map((c) => `+ ${c.name}`).join(", ");
			const c = doc.splitTextToSize(comps, INV_PAGE.width - INV_MARGIN * 2);
			const cc = Array.isArray(c) ? c : [String(c)];
			doc.text(cc, INV_MARGIN + 8, current);
			current += cc.length * (INV_SIZE.body * 1.3);
		}
	});

	return current + 16;
}

function renderSchedule(
	doc: jsPDF,
	y: number,
	schedule: Array<{
		title: string;
		description: string | null;
		startAt: Date;
		endAt: Date | null;
		location: string | null;
	}>,
): number {
	if (schedule.length === 0) return y;
	let current = invEnsureSpace(doc, y, 40);
	doc.setFont(INV_FONT_SANS, "bold");
	doc.setFontSize(INV_SIZE.label);
	doc.setTextColor(INV_GOLD.r, INV_GOLD.g, INV_GOLD.b);
	doc.text("PROGRAMA", INV_MARGIN, current);
	current += INV_SIZE.label * 1.8;

	doc.setFont(INV_FONT_SANS, "normal");
	doc.setFontSize(INV_SIZE.body);
	doc.setTextColor(INV_INK.r, INV_INK.g, INV_INK.b);

	schedule.forEach((item) => {
		current = invEnsureSpace(doc, current, 20);
		const timeStr = `${formatDateTime(item.startAt)}${item.endAt ? " — " + formatTime(item.endAt) : ""}`;
		doc.setFont(INV_FONT_SANS, "bold");
		doc.text(item.title, INV_MARGIN, current);
		current += INV_SIZE.body * 1.4;
		doc.setFont(INV_FONT_SANS, "normal");
		doc.setTextColor(INV_MUTED.r, INV_MUTED.g, INV_MUTED.b);
		doc.text(timeStr, INV_MARGIN, current);
		current += INV_SIZE.body * 1.3;
		if (item.location) {
			doc.text(item.location, INV_MARGIN, current);
			current += INV_SIZE.body * 1.3;
		}
		if (item.description) {
			const d = doc.splitTextToSize(
				item.description,
				INV_PAGE.width - INV_MARGIN * 2,
			);
			doc.text(d, INV_MARGIN, current);
			current += d.length * (INV_SIZE.body * 1.3);
		}
		doc.setTextColor(INV_INK.r, INV_INK.g, INV_INK.b);
		current += 4;
	});

	return current + 16;
}

function renderFooter(doc: jsPDF, page: number, totalPages: number) {
	doc.setFont(INV_FONT_SANS, "normal");
	doc.setFontSize(INV_SIZE.footer);
	doc.setTextColor(INV_MUTED.r, INV_MUTED.g, INV_MUTED.b);
	const text = `Página ${page} de ${totalPages}`;
	const w = doc.getTextWidth(text);
	doc.text(text, (INV_PAGE.width - w) / 2, INV_PAGE.height - 20);
}

function renderQr(doc: jsPDF, y: number, url: string): number {
	let current = invEnsureSpace(doc, y, QR_SIZE + 40);
	doc.setFont(INV_FONT_SANS, "bold");
	doc.setFontSize(INV_SIZE.label);
	doc.setTextColor(INV_GOLD.r, INV_GOLD.g, INV_GOLD.b);
	doc.text("ACEDER AO CONVITE", INV_MARGIN, current);
	current += INV_SIZE.label * 1.8;

	try {
		doc.addImage(url, "PNG", INV_MARGIN, current, QR_SIZE, QR_SIZE);
		current += QR_SIZE + 8;
		doc.setFont(INV_FONT_SANS, "normal");
		doc.setFontSize(INV_SIZE.small);
		doc.setTextColor(INV_MUTED.r, INV_MUTED.g, INV_MUTED.b);
		const cap = "Aponte a câmara para abrir o convite online";
		const c = doc.splitTextToSize(cap, QR_SIZE);
		doc.text(c, INV_MARGIN, current);
		current += c.length * (INV_SIZE.small * 1.3);
	} catch {
		current += 0;
	}

	return current + 16;
}

function formatEventType(type: string): string {
	switch (type) {
		case "WEDDING":
			return "Casamento";
		case "BAPTISM":
			return "Baptismo";
		case "BIRTHDAY":
			return "Aniversário";
		case "ANNIVERSARY":
			return "Aniversário de Casamento";
		case "OTHER":
		default:
			return "Evento";
	}
}

export async function renderInvitationPdf(options: {
	lookup: PublicInvitationLookup;
	schedule: Array<{
		title: string;
		description: string | null;
		startAt: Date;
		endAt: Date | null;
		location: string | null;
	}>;
	qrPng?: string | null;
	generatedAt: Date;
}): Promise<Buffer> {
	if (options.lookup.result !== "AVAILABLE") {
		const doc = new jsPDF({ unit: "pt", format: "a4" });

		drawOrnamentCorner(doc, "top-left");
		drawOrnamentCorner(doc, "bottom-right");
		doc.setFont(INV_FONT_SERIF, "normal");
		doc.setFontSize(INV_SIZE.body);
		doc.text("Convite indisponível.", INV_MARGIN, INV_MARGIN + 40);
		return Buffer.from(doc.output("arraybuffer"));
	}

	const invitation = options.lookup.invitation;
	const doc = new jsPDF({ unit: "pt", format: "a4" });

	setMetadata(doc, invitation.event.name, options.generatedAt);
	drawOrnamentCorner(doc, "top-left");
	drawOrnamentCorner(doc, "bottom-right");

	let y = INV_MARGIN + 20;
	y = renderNames(doc, y, invitation);
	y = renderEventDetails(doc, y, invitation);
	y = renderGuests(doc, y, invitation);
	y = renderSchedule(doc, y, options.schedule);

	if (options.qrPng) {
		y = renderQr(doc, y, options.qrPng);
	}

	const total = doc.getNumberOfPages();
	for (let i = 1; i <= total; i++) {
		doc.setPage(i);
		renderFooter(doc, i, total);
	}

	return Buffer.from(doc.output("arraybuffer"));
}
