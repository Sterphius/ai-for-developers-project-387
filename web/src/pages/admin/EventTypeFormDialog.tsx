import { useEffect, useState } from "react";
import type { EventType } from "@/api/client";
import { useCreateEventType, useUpdateEventType } from "@/api/hooks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useToast } from "@/components/Toaster";
import { getErrorMessage } from "@/lib/errors";

export function EventTypeFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Если передан — режим редактирования, иначе создание. */
  editing?: EventType | null;
}) {
  const { toast } = useToast();
  const createMut = useCreateEventType();
  const updateMut = useUpdateEventType();
  const isEdit = Boolean(editing);

  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFormError(null);
      if (editing) {
        setId(editing.id);
        setTitle(editing.title);
        setDescription(editing.description);
        setDurationMinutes(String(editing.durationMinutes));
      } else {
        setId("");
        setTitle("");
        setDescription("");
        setDurationMinutes("30");
      }
    }
  }, [open, editing]);

  const pending = createMut.isPending || updateMut.isPending;

  async function submit() {
    setFormError(null);
    const duration = Number(durationMinutes);

    if (!isEdit && !id.trim()) {
      setFormError("Укажите id типа события.");
      return;
    }
    if (!title.trim()) {
      setFormError("Укажите название.");
      return;
    }
    if (!Number.isInteger(duration) || duration < 1) {
      setFormError("Длительность должна быть целым числом ≥ 1.");
      return;
    }

    try {
      if (isEdit && editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          body: {
            title: title.trim(),
            description: description.trim(),
            durationMinutes: duration,
          },
        });
        toast("Тип события обновлён.", "success");
      } else {
        await createMut.mutateAsync({
          id: id.trim(),
          title: title.trim(),
          description: description.trim(),
          durationMinutes: duration,
        });
        toast("Тип события создан.", "success");
      }
      onOpenChange(false);
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Редактировать тип события" : "Новый тип события"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Идентификатор изменить нельзя."
              : "Идентификатор задаёт владелец."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="et-id">Идентификатор (id)</Label>
            <Input
              id="et-id"
              value={id}
              onChange={(e) => setId(e.target.value)}
              disabled={isEdit}
              placeholder="intro-call"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="et-title">Название</Label>
            <Input
              id="et-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Вводный звонок"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="et-desc">Описание</Label>
            <Textarea
              id="et-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Короткое знакомство и обсуждение задач"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="et-duration">Длительность (мин)</Label>
            <Input
              id="et-duration"
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>
          {formError && <ErrorBanner error={new Error(formError)} />}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Отмена
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Сохранение…" : isEdit ? "Сохранить" : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
