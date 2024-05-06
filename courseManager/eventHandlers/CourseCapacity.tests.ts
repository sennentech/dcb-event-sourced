import { CourseCapacity } from "./CourseCapacity"
const COURSE_ID = "course-1"
describe("CourseCapacity", () => {
    const courseCapacity = CourseCapacity(COURSE_ID)

    test("should return default state if no events passed", async () => {
        expect(courseCapacity.init).toEqual({ capacity: 0, isFull: true, subscriberCount: 0 })
    })
})
