import { Tags } from "../../eventStore/EventStore"
import * as R from "ramda"

export const ensureIsArray = (stringOrStringArray: string | string[]) =>
    R.is(Array, stringOrStringArray) ? stringOrStringArray : [stringOrStringArray]

export const matchTags = ({ tags, tagFilter }: { tags: Tags; tagFilter: Tags }): boolean => {
    for (const tagFilterKey of R.keys(tagFilter)) {
        const tagFilterValues = ensureIsArray(tagFilter[tagFilterKey])
        if (!tags[tagFilterKey]) return false

        const tagValues = ensureIsArray(tags[tagFilterKey])
        if (!R.intersection(tagFilterValues, tagValues).length) return false
    }
    return true
}
