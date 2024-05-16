import { Tags, EsEvent } from "../EventStore"

export type DbTags = {
    key: string
    value: string
}[]

export type DbEvent = {
    type: string
    data: string
    tags: string
}

export const tagConverter = {
    fromDb: (dbTags: DbTags): Tags =>
        dbTags.reduce<Tags>((acc, { key, value }) => {
            if (acc[key]) {
                const currentValue = acc[key]
                if (Array.isArray(currentValue)) {
                    return { ...acc, [key]: [...currentValue, value] } // Append to existing array
                } else {
                    return { ...acc, [key]: [currentValue, value] } // Convert existing string to array and append
                }
            } else {
                return { ...acc, [key]: value } // Set as string if first occurrence
            }
        }, {}),

    toDb: (tags: Tags): DbTags =>
        Object.entries(tags).reduce<DbTags>((acc, [key, value]) => {
            if (Array.isArray(value)) {
                return acc.concat(value.map(v => ({ key, value: v })))
            } else {
                return acc.concat([{ key, value }])
            }
        }, [])
}

export const dbEventConverter = {
    toDb: (esEvent: EsEvent): DbEvent => ({
        type: esEvent.type,
        data: JSON.stringify(esEvent.data),
        tags: JSON.stringify(tagConverter.toDb(esEvent.tags))
    })
}

export class ParamManager {
    public params: (string | number | boolean)[] = []
    add(paramValue: string | number | boolean): string {
        this.params.push(paramValue)
        return `$${this.params.length}`
    }
}
