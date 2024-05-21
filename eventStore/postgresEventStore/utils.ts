import { Tags, EsEvent, EsEventEnvelope } from "../EventStore"
import { SequenceNumber } from "../SequenceNumber"
import { Timestamp } from "../TimeStamp"

export type DbTags = {
    key: string
    value: string
}[]

export type DbWriteEvent = {
    type: string
    data: string
    tags: string
}

export type DbReadEvent = {
    type: string
    data: any
    tags: DbTags
    timestamp: string
    sequence_number: string
}

export const tagConverter = {
    fromDb: (dbTags: DbTags): Tags =>
        dbTags.reduce<Tags>((acc, { key, value }) => {
            if (acc[key]) {
                const currentValue = acc[key]
                if (Array.isArray(currentValue)) {
                    return { ...acc, [key]: [...currentValue, value] }
                } else {
                    return { ...acc, [key]: [currentValue, value] }
                }
            } else {
                return { ...acc, [key]: value }
            }
        }, {}),

    toDb: (tags: Tags): DbTags =>
        Object.entries(tags ?? {}).reduce<DbTags>((acc, [key, value]) => {
            if (Array.isArray(value)) {
                return acc.concat(value.map(v => ({ key, value: v })))
            } else {
                return acc.concat([{ key, value }])
            }
        }, [])
}

export const dbEventConverter = {
    toDb: (esEvent: EsEvent): DbWriteEvent => ({
        type: esEvent.type,
        data: JSON.stringify(esEvent.data),
        tags: JSON.stringify(tagConverter.toDb(esEvent.tags))
    }),
    fromDb: (dbEvent: DbReadEvent): EsEventEnvelope => ({
        sequenceNumber: SequenceNumber.create(parseInt(dbEvent.sequence_number)),
        timestamp: Timestamp.create(dbEvent.timestamp),
        event: {
            type: dbEvent.type,
            data: dbEvent.data,
            tags: tagConverter.fromDb(dbEvent.tags)
        }
    })
}

export class ParamManager {
    public params: (string | number | boolean)[] = []
    add(paramValue: string | number | boolean): string {
        this.params.push(paramValue)
        return `$${this.params.length}`
    }
}
