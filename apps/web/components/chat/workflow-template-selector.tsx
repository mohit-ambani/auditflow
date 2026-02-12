'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ArrowRight, Clock, FileUp } from 'lucide-react';
import {
  WORKFLOW_TEMPLATES,
  getTemplatesByCategory,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  type WorkflowTemplate
} from '@/lib/workflow-templates';

interface WorkflowTemplateSelectorProps {
  onSelectTemplate: (template: WorkflowTemplate) => void;
  onClose?: () => void;
}

export function WorkflowTemplateSelector({ onSelectTemplate, onClose }: WorkflowTemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const templatesByCategory = getTemplatesByCategory();

  const filteredTemplates = WORKFLOW_TEMPLATES.filter(template => {
    const matchesSearch = searchQuery === '' ||
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = activeCategory === 'all' || template.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Workflow Templates</CardTitle>
          <CardDescription>
            Choose a pre-configured workflow to get started quickly
          </CardDescription>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="reconciliation">Reconcile</TabsTrigger>
              <TabsTrigger value="analysis">Analyze</TabsTrigger>
              <TabsTrigger value="communication">Communicate</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                {filteredTemplates.map((template) => (
                  <WorkflowCard
                    key={template.id}
                    template={template}
                    onSelect={() => onSelectTemplate(template)}
                  />
                ))}

                {filteredTemplates.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-muted-foreground">
                    No workflows match your search
                  </div>
                )}
              </div>
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function WorkflowCard({
  template,
  onSelect
}: {
  template: WorkflowTemplate;
  onSelect: () => void;
}) {
  const Icon = template.icon;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={onSelect}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{template.title}</CardTitle>
              {template.estimatedTime && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Clock className="h-3 w-3" />
                  {template.estimatedTime}
                </div>
              )}
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          {template.description}
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {CATEGORY_LABELS[template.category]}
          </Badge>
          {template.requiresFiles && (
            <Badge variant="outline" className="text-xs">
              <FileUp className="h-3 w-3 mr-1" />
              Upload Required
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for inline display
export function WorkflowTemplateChips({ onSelectTemplate }: { onSelectTemplate: (template: WorkflowTemplate) => void }) {
  const popularTemplates = WORKFLOW_TEMPLATES.filter(t =>
    ['upload-process-invoice', 'monthly-gst-reconciliation', 'vendor-aging-analysis', 'batch-document-upload'].includes(t.id)
  );

  return (
    <div className="flex flex-wrap gap-2">
      {popularTemplates.map((template) => {
        const Icon = template.icon;
        return (
          <Button
            key={template.id}
            variant="outline"
            size="sm"
            onClick={() => onSelectTemplate(template)}
            className="gap-2"
          >
            <Icon className="h-3 w-3" />
            {template.title}
          </Button>
        );
      })}
    </div>
  );
}
