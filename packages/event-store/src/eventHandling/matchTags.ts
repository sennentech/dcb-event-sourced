import { Tags } from "../eventStore/EventStore"

export const ensureIsArray = (stringOrStringArray: string | string[]) =>
    Array.isArray(stringOrStringArray) ? stringOrStringArray : [stringOrStringArray]

export const matchTags = ({ tags, tagFilter }: { tags: Tags; tagFilter: Tags | undefined }): boolean => {
    if (!tagFilter) return true

    for (const tagFilterKey of Object.keys(tagFilter)) {
        const tagFilterValues = ensureIsArray(tagFilter[tagFilterKey])
        if (!tags[tagFilterKey]) return false

        const tagValues = ensureIsArray(tags[tagFilterKey])
        if (!tagFilterValues.filter(value => tagValues.includes(value)).length) return false
    }
    return true
}
