import { Tags } from "./Tags"

describe("Tags", () => {
    test("should create tags from a valid object", () => {
        const tags = Tags.fromObj({ courseId: "c1", studentId: "s1" })
        expect(tags.values).toEqual(["courseId=c1", "studentId=s1"])
    })

    test("should create tags from a valid array", () => {
        const tags = Tags.from(["courseId=c1", "studentId=s1"])
        expect(tags.values).toEqual(["courseId=c1", "studentId=s1"])
    })

    test('should throw error for invalid tag with multiple "="', () => {
        expect(() => Tags.from(["key==value"])).toThrow(/Invalid tag value/)
    })

    test("should throw error for invalid tag with non alphanumeric/hyphen characters", () => {
        expect(() => Tags.from(["key=value!"])).toThrow(/Invalid tag value/)
    })

    test("should throw error for invalid tag with empty key", () => {
        expect(() => Tags.fromObj({ "": "value" })).toThrow(/Invalid tag value/)
    })

    test("should throw error for invalid tag with empty value", () => {
        expect(() => Tags.fromObj({ key: "" })).toThrow(/Invalid tag value/)
    })

    test("should allow tags with hyphens", () => {
        const tags = Tags.from(["course-id=c1", "student-id=s1"])
        expect(tags.values).toEqual(["course-id=c1", "student-id=s1"])
    })

    test("should return true when two tags objects are identical", () => {
        const tags1 = Tags.fromObj({ courseId: "c1", studentId: "s1" })
        const tags2 = Tags.fromObj({ courseId: "c1", studentId: "s1" })
        expect(tags1.equals(tags2)).toBe(true)
    })

    test("should return false when tags have different lengths", () => {
        const tags1 = Tags.from(["courseId=c1"])
        const tags2 = Tags.from(["courseId=c1", "studentId=s1"])
        expect(tags1.equals(tags2)).toBe(false)
    })

    test("should return false when tags order differs", () => {
        const tags1 = Tags.from(["courseId=c1", "studentId=s1"])
        const tags2 = Tags.from(["studentId=s1", "courseId=c1"])
        expect(tags1.equals(tags2)).toBe(false)
    })
})
