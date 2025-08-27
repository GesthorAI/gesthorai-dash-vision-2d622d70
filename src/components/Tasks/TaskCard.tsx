import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Clock, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  Users, 
  MoreVertical,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Task, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { format, isAfter, isBefore, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskCardProps {
  task: Task & { leads?: { name: string; business: string } };
  onEdit?: (task: Task) => void;
}

const priorityColors = {
  baixa: "bg-gray-100 text-gray-800",
  media: "bg-blue-100 text-blue-800", 
  alta: "bg-orange-100 text-orange-800",
  urgente: "bg-red-100 text-red-800"
};

const statusColors = {
  pendente: "bg-yellow-100 text-yellow-800",
  concluida: "bg-green-100 text-green-800",
  cancelada: "bg-gray-100 text-gray-800"
};

const typeIcons = {
  follow_up: User,
  call: Phone,
  email: Mail,
  meeting: Users,
  other: Clock
};

export const TaskCard = ({ task, onEdit }: TaskCardProps) => {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  
  const dueDate = new Date(task.due_date);
  const now = new Date();
  const isOverdue = isBefore(dueDate, now) && task.status === 'pendente';
  const isDueToday = isToday(dueDate);
  
  const TypeIcon = typeIcons[task.type];

  const handleStatusChange = (checked: boolean) => {
    updateTask.mutate({
      id: task.id,
      status: checked ? 'concluida' : 'pendente'
    });
  };

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      deleteTask.mutate(task.id);
    }
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      isOverdue ? 'border-red-200 bg-red-50/30' : 
      isDueToday ? 'border-orange-200 bg-orange-50/30' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Checkbox
              checked={task.status === 'concluida'}
              onCheckedChange={handleStatusChange}
              disabled={updateTask.isPending}
              className="mt-1"
            />
            
            <div className="flex-1 space-y-1">
              <h3 className={`font-medium leading-tight ${
                task.status === 'concluida' ? 'line-through text-muted-foreground' : ''
              }`}>
                {task.title}
              </h3>
              
              {task.description && (
                <p className="text-sm text-muted-foreground">
                  {task.description}
                </p>
              )}
              
              {task.leads && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  {task.leads.name} - {task.leads.business}
                </div>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(task)}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700"
              >
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TypeIcon className="h-4 w-4 text-muted-foreground" />
            
            <Badge variant="outline" className={priorityColors[task.priority]}>
              {task.priority}
            </Badge>
            
            <Badge variant="outline" className={statusColors[task.status]}>
              {task.status}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1 text-sm">
            {isOverdue && task.status === 'pendente' && (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            {task.status === 'concluida' && (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
            {task.status === 'cancelada' && (
              <XCircle className="h-4 w-4 text-gray-600" />
            )}
            
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className={`${
              isOverdue ? 'text-red-600 font-medium' : 
              isDueToday ? 'text-orange-600 font-medium' : 
              'text-muted-foreground'
            }`}>
              {format(dueDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};