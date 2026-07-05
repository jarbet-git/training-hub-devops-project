import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ForbiddenPage() {
  const nav = useNavigate();

  return (
    <div className="min-h-dvh grid place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md rounded-2xl bg-background/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Brak dostępu</CardTitle>
          <div className="text-sm text-muted-foreground">
            Konto nieaktywne lub brak uprawnień.
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" className="rounded-xl" onClick={() => nav("/login", { replace: true })}>
            Powrót do logowania
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
