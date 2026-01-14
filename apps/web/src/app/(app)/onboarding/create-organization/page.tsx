import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { CreateOrganizationForm } from './_components/create-organization-form'

export default async function Page() {
  return (
    <div className="w-full max-w-xl p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create Organization</CardTitle>
          <CardDescription>Set up your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateOrganizationForm />
        </CardContent>
      </Card>
    </div>
  )
}
