import { TasksList } from "@/components/Tasks/TasksList";

export const Tasks = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
        <p className="text-muted-foreground">
          Gerencie suas tarefas e follow-ups com leads
        </p>
      </div>

      <TasksList />
    </div>
  );
};