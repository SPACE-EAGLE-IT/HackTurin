import { BackLink } from '@/components/ds/back-link'
import PageHeader from '@/components/ds/page-header'
import { CategoryManager } from '@/components/help-desk/category-manager'
import { NewCategoryButton } from '@/components/help-desk/new-category-dialog'
import { requirePageAccess } from '@/lib/access/guard'
import { listCategories } from '@/lib/help-desk/queries'

export default async function HelpDeskSettingsPage() {
  await requirePageAccess('help_desk', 'admin')
  const categories = await listCategories({ includeInactive: true })

  return (
    <div className='space-y-6'>
      <BackLink href='/help-desk'>Help desk</BackLink>
      <PageHeader
        title="Impostazioni dell'help desk"
        description='Le categorie con cui si classificano i ticket.'
        actions={<NewCategoryButton />}
      />
      <CategoryManager categories={categories} />
    </div>
  )
}
