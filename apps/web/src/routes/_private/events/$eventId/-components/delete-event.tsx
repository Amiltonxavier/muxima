import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@muxima/ui/components/dialog";
import { useDeleteEvent } from "../../-queries/event-queries";
import { Button } from "@muxima/ui/components/button";

interface DeleteEventProps {
    open: boolean,
    onOpenChange: VoidFunction,
    eventId: string
    eventName: string;
}

export function DeleteEvent({ onOpenChange, open, eventId, eventName }: DeleteEventProps) {
    const { mutateAsync, isPending } = useDeleteEvent();

    const handleDelete = async () => {
        await mutateAsync({ id: eventId }).then(() => {
            onOpenChange()
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Eliminar evento</DialogTitle>
                    <DialogDescription>
                        Tem a certeza que deseja eliminar o evento "{eventName}"? Toda a
                        informação associada será permanentemente removida. Esta ação não
                        pode ser desfeita.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onOpenChange}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isPending}
                    >
                        {isPending ? "A eliminar..." : "Eliminar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
