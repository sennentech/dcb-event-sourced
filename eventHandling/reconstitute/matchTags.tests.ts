import { Tags } from "../../eventStore/EventStore"
import { matchTags } from "./matchTags"

describe("matchTags", () => {
    test("should return true when no tagFilter", () => {
        const tags: Tags = { courseId: "1" }
        const tagFilter: Tags = {}

        const result = matchTags({ tags, tagFilter })
        expect(result).toBe(true)
    })

    test("should return false when tagFilter has different tag value", () => {
        const tags: Tags = { courseId: "c1" }
        const tagFilter: Tags = { courseId: "c2" }

        const result = matchTags({ tags, tagFilter })
        expect(result).toBe(false)
    })

    test("should return false when tags are empty", () => {
        const tags: Tags = {}
        const tagFilter: Tags = { courseId: "c2" }

        const result = matchTags({ tags, tagFilter })
        expect(result).toBe(false)
    })

    test("should return false when tags are different keys", () => {
        const tags: Tags = { studentId: "s1" }
        const tagFilter: Tags = { courseId: "c2" }

        const result = matchTags({ tags, tagFilter })
        expect(result).toBe(false)
    })

    test("should return true when some tags are matched", () => {
        const tags: Tags = { studentId: "s1", courseId: "c1" }
        const tagFilter: Tags = { courseId: "c1" }

        const result = matchTags({ tags, tagFilter })
        expect(result).toBe(true)
    })

    test("should return false when some tags are matched but filter still has more", () => {
        const tags: Tags = { studentId: "s1" }
        const tagFilter: Tags = { courseId: "c1", studentId: "s1" }

        const result = matchTags({ tags, tagFilter })
        expect(result).toBe(false)
    })

    test("should return false when double tags are matched", () => {
        const tags: Tags = { courseId: "c1", studentId: "s1" }
        const tagFilter: Tags = { courseId: "c1", studentId: "s1" }

        const result = matchTags({ tags, tagFilter })
        expect(result).toBe(true)
    })
})
