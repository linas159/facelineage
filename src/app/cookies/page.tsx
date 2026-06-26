import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { getLegal } from "@/lib/i18n/legal";
import { LegalDocPage } from "@/components/legal-doc";

export async function generateMetadata(): Promise<Metadata> {
  const doc = getLegal(await getLocale()).cookies;
  return { title: doc.metaTitle, description: doc.metaDescription };
}

export default async function CookiesPage() {
  const legal = getLegal(await getLocale());
  return <LegalDocPage doc={legal.cookies} ui={legal.ui} />;
}
