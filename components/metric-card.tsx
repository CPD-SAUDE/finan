import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type MetricCardProps = {
  title?: string
  value?: string | number
  hint?: string
}

export function MetricCard({ title = "Métrica", value = "-", hint = "" }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}
