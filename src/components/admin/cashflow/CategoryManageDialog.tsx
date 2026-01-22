import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CashflowCategory,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/admin/useCashflow";

interface CategoryManageDialogProps {
  categories: CashflowCategory[];
  children: React.ReactNode;
}

const TYPE_LABELS: Record<string, string> = {
  income: "הכנסות",
  expense: "הוצאות",
  other_expense: "הוצאות נוספות",
};

const TYPE_COLORS: Record<string, string> = {
  income: "bg-green-100 text-green-700",
  expense: "bg-red-100 text-red-700",
  other_expense: "bg-orange-100 text-orange-700",
};

export default function CategoryManageDialog({ categories, children }: CategoryManageDialogProps) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"income" | "expense" | "other_expense">("income");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const handleAdd = () => {
    if (!newName.trim()) return;
    createCategory.mutate({ name: newName.trim(), type: newType });
    setNewName("");
  };

  const handleRename = (id: string) => {
    if (!editName.trim()) return;
    updateCategory.mutate({ id, name: editName.trim() });
    setEditingId(null);
    setEditName("");
  };

  const handleDelete = (id: string) => {
    deleteCategory.mutate(id);
  };

  const groupedCategories = {
    income: categories.filter((c) => c.type === "income"),
    expense: categories.filter((c) => c.type === "expense"),
    other_expense: categories.filter((c) => c.type === "other_expense"),
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>ניהול קטגוריות</DialogTitle>
        </DialogHeader>

        {/* Add new category */}
        <div className="flex gap-2 items-end border-b pb-4 mb-4">
          <div className="flex-1">
            <Input
              placeholder="שם קטגוריה חדשה..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <Select value={newType} onValueChange={(v) => setNewType(v as typeof newType)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">הכנסות</SelectItem>
              <SelectItem value="expense">הוצאות</SelectItem>
              <SelectItem value="other_expense">הוצאות נוספות</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Category lists by type */}
        {(["income", "expense", "other_expense"] as const).map((type) => (
          <div key={type} className="mb-4">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Badge className={TYPE_COLORS[type]}>{TYPE_LABELS[type]}</Badge>
              <span className="text-muted-foreground text-xs">
                ({groupedCategories[type].length})
              </span>
            </h4>
            <div className="space-y-1">
              {groupedCategories[type].map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 group"
                >
                  <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  {editingId === cat.id ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleRename(cat.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(cat.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="h-7 text-sm flex-1"
                    />
                  ) : (
                    <span
                      className="flex-1 text-sm cursor-pointer"
                      onDoubleClick={() => {
                        setEditingId(cat.id);
                        setEditName(cat.name);
                      }}
                    >
                      {cat.name}
                      {cat.is_default && (
                        <span className="text-xs text-muted-foreground mr-1">(ברירת מחדל)</span>
                      )}
                    </span>
                  )}
                  {!cat.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(cat.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="text-xs text-muted-foreground mt-2">
          לחצו פעמיים על שם קטגוריה כדי לשנות אותו. קטגוריות ברירת מחדל ניתנות לשינוי שם אך לא למחיקה.
        </p>
      </DialogContent>
    </Dialog>
  );
}
