import enTestPack from "@/messages/en/testPack.json"
import ruTestPack from "@/messages/ru/testPack.json"
import enCodes from "@/messages/en/codes.json"
import enCommon from "@/messages/en/common.json"
import enErection from "@/messages/en/erection.json"
import enNav from "@/messages/en/nav.json"
import ruCodes from "@/messages/ru/codes.json"
import ruCommon from "@/messages/ru/common.json"
import ruErection from "@/messages/ru/erection.json"
import ruNav from "@/messages/ru/nav.json"

import enShell from "@/messages/en/shell.json"
import ruShell from "@/messages/ru/shell.json"

import enHelp from "@/messages/en/help.json"
import ruHelp from "@/messages/ru/help.json"

import enAuth from "@/messages/en/auth.json"
import ruAuth from "@/messages/ru/auth.json"

import enFabrication from "@/messages/en/fabrication.json"
import ruFabrication from "@/messages/ru/fabrication.json"

import enFlange from "@/messages/en/flange.json"
import ruFlange from "@/messages/ru/flange.json"

import enNde from "@/messages/en/nde.json"
import ruNde from "@/messages/ru/nde.json"

import enSpooling from "@/messages/en/spooling.json"
import ruSpooling from "@/messages/ru/spooling.json"

import enHome from "@/messages/en/home.json"
import ruHome from "@/messages/ru/home.json"

import enProjects from "@/messages/en/projects.json"
import ruProjects from "@/messages/ru/projects.json"

import enDocuments from "@/messages/en/documents.json"
import ruDocuments from "@/messages/ru/documents.json"


import enProjectSetup from "@/messages/en/projectSetup.json"
import ruProjectSetup from "@/messages/ru/projectSetup.json"

import enAdmin from "@/messages/en/admin.json"
import ruAdmin from "@/messages/ru/admin.json"

import enAccess from "@/messages/en/access.json"
import ruAccess from "@/messages/ru/access.json"

import enTracking from "@/messages/en/tracking.json"
import ruTracking from "@/messages/ru/tracking.json"

import type { Locale } from "./locale"

export type MessageTree = { [key: string]: string | MessageTree }

/**
 * English is the source: a key exists here first. Each translation task registers its namespace
 * in both objects below.
 */
export const en = {
  common: enCommon,
  codes: enCodes,
  erection: enErection,
  nav: enNav,
  shell: enShell,
  help: enHelp,
  auth: enAuth,
  fabrication: enFabrication,
  flange: enFlange,
  nde: enNde,
  testPack: enTestPack,
  spooling: enSpooling,
  home: enHome,
  projects: enProjects,
  documents: enDocuments,
  projectSetup: enProjectSetup,
  admin: enAdmin,
  access: enAccess,
  tracking: enTracking,
}

export type Messages = typeof en
export type Namespace = keyof Messages

/** Russian may lag behind English; a missing key falls back to English (see `mergeMessages`). */
export const ru: { [N in Namespace]?: MessageTree } = {
  common: ruCommon,
  codes: ruCodes,
  erection: ruErection,
  nav: ruNav,
  shell: ruShell,
  help: ruHelp,
  auth: ruAuth,
  fabrication: ruFabrication,
  flange: ruFlange,
  nde: ruNde,
  testPack: ruTestPack,
  spooling: ruSpooling,
  home: ruHome,
  projects: ruProjects,
  documents: ruDocuments,
  projectSetup: ruProjectSetup,
  admin: ruAdmin,
  access: ruAccess,
  tracking: ruTracking,
}

/** `base` with every key `override` has in the same shape; stray or misshapen keys are dropped. */
export function mergeMessages(base: MessageTree, override: MessageTree | undefined): MessageTree {
  if (!override) return base
  const merged: MessageTree = { ...base }
  for (const [key, value] of Object.entries(override)) {
    const current = base[key]
    if (current === undefined) continue
    if (typeof current === "string") {
      if (typeof value === "string") merged[key] = value
    } else if (typeof value !== "string") {
      merged[key] = mergeMessages(current, value)
    }
  }
  return merged
}

export function messagesFor(locale: Locale): Messages {
  if (locale === "en") return en
  return mergeMessages(en as unknown as MessageTree, ru as MessageTree) as unknown as Messages
}
