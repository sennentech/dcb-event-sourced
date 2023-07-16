import { ValueObject } from "./ValueObject"
type DomainIdValue = Array<Record<string, string>>

interface DomainIdsProps {
    value: DomainIdValue
}

export class DomainIds extends ValueObject<DomainIdsProps> {
    get value(): DomainIdValue {
        return this.props.value
    }

    private constructor(props: DomainIdsProps) {
        super(props)
    }

    public static create(domainIds: DomainIdValue): DomainIds {
        return new DomainIds({ value: domainIds })
    }
}
