export default async function Layout({
  children,
  modals,
}: Readonly<{
  children: React.ReactNode
  modals: React.ReactNode
}>) {
  return (
    <>
      {children}
      {modals}
    </>
  )
}
