"use client";

import { useState } from "react";
import { Plus, Trash2, Key, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSecrets, useCreateSecret, useDeleteSecret } from "@/lib/queries";

export function SecretManager() {
  const { data: secrets, isLoading } = useSecrets();
  const createSecret = useCreateSecret();
  const deleteSecret = useDeleteSecret();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [provider, setProvider] = useState("openai");

  const handleAdd = async () => {
    if (!name || !value) return;
    await createSecret.mutateAsync({ name, value, provider });
    setName("");
    setValue("");
    setShowForm(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Keys
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" />
          Add Key
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4 space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input placeholder="My OpenAI Key" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="google">Google AI</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>API Key</Label>
              <Input type="password" placeholder="sk-..." value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <Button onClick={handleAdd} disabled={createSecret.isPending} size="sm">
              {createSecret.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Key
            </Button>
          </div>
        )}

        {isLoading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>
        ) : secrets && secrets.length > 0 ? (
          <div className="space-y-2">
            {secrets.map((secret: { id: string; name: string; provider: string; created_at: string }) => (
              <div key={secret.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{secret.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{secret.provider}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteSecret.mutate(secret.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No API keys saved yet. Add one to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
