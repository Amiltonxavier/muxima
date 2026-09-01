import { dateHelper } from "@/core/helpers/date-helper";
import { getStatusLabel } from "@/shared/utils/status-helpers";
import { Button } from "@muxima/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@muxima/ui/components/card";
import { StatusBadge, type AppStatus } from "@muxima/ui/components/kibo-ui/status";
import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Trash2 } from "lucide-react";
import { useState } from "react";
import { DeleteEventDialog } from "./delete-event-dialog";
import { useSelected } from "@/core/hooks/useSelected";

interface EventCardProps {
    event: Record<string, unknown>;
}

export function EventCard({ event }: EventCardProps) {
    const eventDate = event.eventDate as string | undefined;
    const { clearSelection, isSelected, onSelect, selectedItem } = useSelected()

    const daysRemaining = eventDate
        ? dateHelper.daysUntilExpiration(eventDate)
        : null;

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <CardTitle>{event.name as string}</CardTitle>
                            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                <Calendar className="h-3 w-3" />
                                <span>
                                    {eventDate ? dateHelper.formatMedium(eventDate) : "Sem data"}
                                </span>
                            </div>
                        </div>
                        <StatusBadge
                            status={((event.status as string) || "DRAFT") as AppStatus}
                            label={getStatusLabel(
                                (event.status as string) || "DRAFT",
                                "event",
                            )}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <MapPin className="h-3 w-3" />
                            <span>
                                {event.venueName
                                    ? (event.venueName as string)
                                    : "Local não definido"}
                            </span>
                        </div>
                        {daysRemaining !== null && (
                            <div className="text-muted-foreground text-xs">
                                {dateHelper.isToday(eventDate!)
                                    ? "É hoje!"
                                    : daysRemaining > 0
                                        ? `${daysRemaining} dias restantes`
                                        : "Evento realizado"}
                            </div>
                        )}
                        <div className="flex items-center justify-between pt-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                render={
                                    <Link
                                        to="/events/$eventId"
                                        params={{ eventId: String(event.id) }}
                                    />
                                }
                            >
                                Ver detalhes →
                            </Button>
                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="text-destructive"
                                    onClick={() => onSelect(event.id as string)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            {isSelected && selectedItem &&
                <DeleteEventDialog
                    onOpenChange={clearSelection}
                    open={isSelected}
                    eventId={selectedItem as unknown as string}
                />
            }
        </>
    );
}
