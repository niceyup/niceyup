import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { CreateSourceForm } from './_components/create-source-form'

export default async function Page() {
  return (
    <div className="w-full max-w-xl p-4 md:p-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-center font-semibold text-xl leading-none">
            Create a Source
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-5">
          <CreateSourceForm />
        </CardContent>
      </Card>
    </div>
  )
}
