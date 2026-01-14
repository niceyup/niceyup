import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { InterceptedDialogContent } from '@workspace/ui/components/intercepted-dialog-content'
import { CreateOrganizationForm } from '../../../onboarding/create-organization/_components/create-organization-form'

export default async function Page() {
  return (
    <Dialog defaultOpen>
      <InterceptedDialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>Set up your organization.</DialogDescription>
        </DialogHeader>

        <CreateOrganizationForm modal />
      </InterceptedDialogContent>
    </Dialog>
  )
}
