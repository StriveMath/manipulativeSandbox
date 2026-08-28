/**
 * The `.manipulative.json` interchange format.
 *
 * One artifact connects the two repos, and its `scene` key is already
 * exactly Strive's `Scene`. The import side can hand it straight to
 * `parseScene` with no translation, which is the whole point: any mapping
 * layer would be a second place for the shape to drift.
 *
 * `title` and `description` sit outside `scene` because they are row
 * columns on `learn_Manipulatives`, not scene fields.
 */

export const FORMAT_VERSION = 1

export const FILE_EXTENSION = '.manipulative.json'

/**
 * Build one record from a conversion result.
 *
 * Optional scene fields are omitted rather than set to null. Strive's
 * SceneSchema marks them `.optional()`, and a present `null` fails that
 * where an absent key passes.
 */
export function buildManipulativeRecord({ source, conversion, model }) {
  const element = {
    code: conversion.code,
    props: conversion.props ?? {},
    state: conversion.state ?? {},
    canvasHeight: conversion.canvasHeight,
  }
  if (conversion.caption) element.caption = conversion.caption

  const scene = { element }
  if (conversion.prompt) scene.prompt = conversion.prompt

  return {
    source: {
      repo: 'manipulativeSandbox',
      id: source.id,
      owner: source.ownerSlug,
    },
    convertedBy: model,
    title: conversion.title,
    description: null,
    // Kept in the file on purpose. This is the model admitting what it
    // guessed or could not preserve, and it should survive the handoff to
    // whoever reviews the import rather than living only in the panel.
    notes: conversion.notes ?? [],
    scene,
  }
}

/** A single manipulative: the record plus the envelope fields. */
export function buildSingleFile(record) {
  return {
    formatVersion: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    ...record,
  }
}

/** Several manipulatives under one envelope. */
export function buildBundleFile(records) {
  return {
    formatVersion: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    manipulatives: records,
  }
}

/** `Factor Tree` -> `factor-tree.manipulative.json` */
export function fileNameFor(id) {
  return `${id}${FILE_EXTENSION}`
}

export function downloadJson(fileName, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
