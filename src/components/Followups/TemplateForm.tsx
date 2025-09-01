import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

export interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  message: string;
  variables: string[];
}

interface TemplateFormProps {
  template?: MessageTemplate;
  onSubmit: (data: Omit<MessageTemplate, 'id'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const AVAILABLE_VARIABLES = [
  'name', 'business', 'city', 'phone', 'email', 'niche', 'score'
];

export const TemplateForm: React.FC<TemplateFormProps> = ({
  template,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    category: template?.category || 'follow_up',
    message: template?.message || '',
    variables: template?.variables || []
  });

  const [newVariable, setNewVariable] = useState('');

  const handleAddVariable = (variable: string) => {
    if (variable && !formData.variables.includes(variable)) {
      setFormData(prev => ({
        ...prev,
        variables: [...prev.variables, variable]
      }));
    }
    setNewVariable('');
  };

  const handleRemoveVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v !== variable)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const previewMessage = formData.message.replace(
    /\{\{(\w+)\}\}/g,
    (match, variable) => {
      const examples: Record<string, string> = {
        name: 'João Silva',
        business: 'Silva & Associados',
        city: 'São Paulo',
        phone: '(11) 99999-9999',
        email: 'joao@silva.com.br',
        niche: 'Advocacia',
        score: '85'
      };
      return examples[variable] || match;
    }
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Template</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Follow-up Inicial"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Select 
            value={formData.category} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="follow_up">Follow-up</SelectItem>
              <SelectItem value="introduction">Introdução</SelectItem>
              <SelectItem value="offer">Oferta</SelectItem>
              <SelectItem value="reminder">Lembrete</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Mensagem</Label>
        <Textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
          placeholder="Olá {{name}}, tudo bem? Sou da {{business}}..."
          rows={4}
          required
        />
        <p className="text-xs text-muted-foreground">
          Use {"{{variavel}}"} para inserir dados dos leads dinamicamente
        </p>
      </div>

      <div className="space-y-3">
        <Label>Variáveis Disponíveis</Label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_VARIABLES.map((variable) => (
            <Button
              key={variable}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddVariable(variable)}
              disabled={formData.variables.includes(variable)}
            >
              {variable}
            </Button>
          ))}
        </div>
        
        <div className="flex gap-2">
          <Input
            value={newVariable}
            onChange={(e) => setNewVariable(e.target.value)}
            placeholder="Nova variável customizada"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddVariable(newVariable);
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleAddVariable(newVariable)}
          >
            Adicionar
          </Button>
        </div>

        {formData.variables.length > 0 && (
          <div className="space-y-2">
            <Label>Variáveis do Template</Label>
            <div className="flex flex-wrap gap-2">
              {formData.variables.map((variable) => (
                <Badge key={variable} variant="secondary" className="gap-1">
                  {variable}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleRemoveVariable(variable)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {formData.message && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Preview da Mensagem</CardTitle>
            <CardDescription>Como ficará a mensagem com dados de exemplo</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">
              {previewMessage}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : template ? 'Atualizar' : 'Criar Template'}
        </Button>
      </div>
    </form>
  );
};