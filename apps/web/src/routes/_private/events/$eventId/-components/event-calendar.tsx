import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@muxima/ui/components/card";
import {
    CalendarBody,
    CalendarDate,
    CalendarDatePagination,
    CalendarDatePicker,
    CalendarHeader,
    CalendarItem,
    CalendarMonthPicker,
    CalendarProvider,
    type CalendarState,
    CalendarYearPicker,
    type Feature,
    useCalendarMonth,
    useCalendarYear,
} from "@muxima/ui/components/kibo-ui/calendar";
import { CalendarDays } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useEvent } from "@/routes/_private/events/-queries/event-queries";
import type { StatusTone } from "@/shared/components/status-dot";
import { dateHelper } from "@/shared/utils/date-helper";
import { EVENT_STATUS_LABELS, getStatusTone } from "@/utils/status-helpers";

/** Anos mostrados a mais em cada lado do ano do evento, no seletor. */
const YEAR_RANGE = 5;

/**
 * Cor do marcador por tom semântico. As mesmas cores que o `StatusDot`, mas
 * como variáveis CSS porque o `CalendarItem` pinta o ponto via `style`.
 */
const TONE_COLORS: Record<StatusTone, string> = {
    neutral: "var(--muted-foreground)",
    info: "var(--chart-5)",
    success: "var(--chart-4)",
    warning: "var(--chart-1)",
    danger: "var(--destructive)",
};

interface EventCalendarCardProps {
    eventId: string;
    disabledControl?: boolean;
}

/**
 * Calendário mensal que marca o dia do evento. A grelha, o cabeçalho e os
 * seletores de mês/ano vêm do Calendar do kibo-ui; a única parte específica
 * do Muxima é construir o `Feature` único a partir da data do evento.
 */
export function EventCalendarCard({ eventId, disabledControl = false }: EventCalendarCardProps) {
    const event = useEvent(eventId).data;

    const eventDate = useMemo(
        () => (event?.eventDate ? dateHelper.getDate(event.eventDate) : null),
        [event?.eventDate],
    );

    const [, setMonth] = useCalendarMonth();
    const [, setYear] = useCalendarYear();

    // Abre o calendário no mês do evento assim que a data chega; a navegação
    // manual (paginação, seletores) prevalece a partir daí.
    useEffect(() => {
        if (!eventDate) return;
        setMonth(eventDate.getMonth() as CalendarState["month"]);
        setYear(eventDate.getFullYear());
    }, [eventDate, setMonth, setYear]);

    const features = useMemo<Feature[]>(() => {
        if (!event || !eventDate) return [];

        return [
            {
                id: eventId,
                name: event.name,
                startAt: eventDate,
                endAt: eventDate,
                status: {
                    id: event.status,
                    name: EVENT_STATUS_LABELS[event.status] ?? event.status,
                    color: TONE_COLORS[getStatusTone(event.status)],
                },
            },
        ];
    }, [event, eventDate, eventId]);

    const currentYear = new Date().getFullYear();
    const anchorYear = eventDate?.getFullYear() ?? currentYear;
    const yearStart = Math.min(currentYear, anchorYear) - YEAR_RANGE;
    const yearEnd = Math.max(currentYear, anchorYear) + YEAR_RANGE;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4" />
                    Calendário
                </CardTitle>
            </CardHeader>

            <CardContent>
                <CalendarProvider
                    className="gap-4 overflow-hidden rounded-lg border"
                    locale="pt-PT"
                    startDay={1}
                >
                    {disabledControl && (
                        <CalendarDate>
                            <CalendarDatePicker>
                                <CalendarMonthPicker />
                                <CalendarYearPicker end={yearEnd} start={yearStart} />
                            </CalendarDatePicker>
                            <CalendarDatePagination />
                    </CalendarDate>)}
                    <CalendarHeader />
                    <CalendarBody features={features}>
                        {({ feature }) => <CalendarItem feature={feature} />}
                    </CalendarBody>
                </CalendarProvider>
            </CardContent>
        </Card>
    );
}
