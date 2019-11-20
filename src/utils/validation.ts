import { PlannerWidgetContainerProps } from "../../typings/PlannerWidgetProps";
import uuid from "uuid/v4";

export type TypeValidationSeverity = "fatal" | "warning";

export interface ValidateExtraProps {
    noFileSystemDocument?: boolean;
    noPersistentVerification?: boolean;
}

export class ValidationMessage {
    id: string;
    message: string;
    dismissable: boolean;
    fatal: boolean;

    constructor(message: string, type: TypeValidationSeverity = "fatal") {
        this.id = uuid();
        this.message = message;
        this.dismissable = type !== "fatal";
        this.fatal = type === "fatal";
    }
}

export const validateProps = (
    props: PlannerWidgetContainerProps,
    extraProps: ValidateExtraProps = {}
): ValidationMessage[] => {
    const messages: ValidationMessage[] = [];
    const addValidation = (category: string, msg: string): void => {
        messages.push(new ValidationMessage(`${category} :: ${msg}`));
    };

    if (extraProps.noFileSystemDocument) {
        addValidation("Data", "Configured entity is not of type 'System.FileDocument'! Widget disabled");
    }

    if (extraProps.noPersistentVerification) {
        addValidation("Verification", "Verification entity can only be a non-persistable entity");
    }

    // Resource

    if (props.resourceDataSource === "mf" && !props.resourceGetDataMf) {
        addValidation("Resources", "No Data Source microflow configured");
    }

    if (props.resourceDataSource === "nf" && !props.resourceGetDataNf.nanoflow) {
        addValidation("Resources", "No Data Source nanoflow configured");
    }

    if (props.resourceTitleType === "attribute" && !props.resourceTitleAttr) {
        addValidation("Resources", "Resource title type is attribute, but no attribute is selected");
    }

    if (props.resourceTitleType === "nanoflow" && !props.resourceTitleNf.nanoflow) {
        addValidation("Resources", "Resource title type is nanoflow, but no nanoflow is selected");
    }

    // Entries

    if (props.entryDataSource === "mf" && !props.entryGetDataMf) {
        addValidation("Entries", "No entries Data Source microflow configured");
    }

    if (props.entryDataSource === "nf" && !props.entryGetDataNf.nanoflow) {
        addValidation("Entries", "No entries Data Source nanoflow configured");
    }

    if (props.entryTitleType === "attribute" && !props.entryTitleAttr) {
        addValidation("Resources", "Entry title type is attribute, but no attribute is selected");
    }

    if (props.entryTitleType === "nanoflow" && !props.entryTitleNf.nanoflow) {
        addValidation("Resources", "Entry title type is nanoflow, but no nanoflow is selected");
    }

    // Events

    if (props.eventEntryOnClickAction === "mf" && !props.eventEntryOnClickMf) {
        addValidation("Events", "No Entry click microflow configured");
    }

    if (props.eventEntryOnClickAction === "nf" && !props.eventEntryOnClickNf.nanoflow) {
        addValidation("Events", "No Entry click nanoflow configured");
    }

    if (props.eventEntryOnClickAction === "open" && !props.eventEntryOnClickForm) {
        addValidation("Events", "No Entry click page configured");
    }

    if (props.eventEmptyOnClickAction === "mf" && !props.eventEmptyOnClickMf) {
        addValidation("Events", "No Empty click microflow configured");
    }

    if (props.eventEmptyOnClickAction === "nf" && !props.eventEmptyOnClickNf.nanoflow) {
        addValidation("Events", "No Empty click nanoflow configured");
    }

    return messages;
};
