import type { Metadata } from 'next'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import config from '@payload-config'
import { importMap } from '../importMap'

type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({
    config,
    params,
    searchParams: searchParams as Promise<{ [key: string]: string | string[] }>,
  })

export default function Page({ params, searchParams }: Args) {
  return (
    <RootPage
      config={config}
      params={params}
      searchParams={searchParams as Promise<{ [key: string]: string | string[] }>}
      importMap={importMap}
    />
  )
}
