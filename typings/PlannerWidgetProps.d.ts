import { CSSProperties } from "react";
import { ICommonWidgetProps, INanoflow } from "@jeltemx/mendix-react-widget-utils";

export type DataSource = "xpath" | "mf" | "nf";
export type SimpleDataSource = "mf" | "nf";
export type FullAction = "nothing" | "mf" | "nf" | "open";
export type SimpleAction = "nothing" | "mf" | "nf";
export type PageLocation = "content" | "popup" | "modal";
export type ClickType = "single" | "double";
export type TitleDataSourceType = "attribute" | "nanoflow";

export interface Nanoflow extends INanoflow {}

export namespace Style {
    export type HeightUnitType = "percentageOfWidth" | "percentageOfParent" | "pixels";
    export type WidthUnitType = "percentage" | "pixels";
}

export interface PlannerWidgetUIProps {
    tableLeftColumnWidth: number;
    tableCellColumnWidth: number;
    tableLockHeaderRow: boolean;
    tableLockLeftColumn: boolean;

    height: number;
    heightUnit: Style.HeightUnitType;
    width: number;
    widthUnit: Style.WidthUnitType;

    scrollToToday: boolean;
}

export interface PlannerWidgetEventProps {
    eventResourceOnClickAction: FullAction;
    eventResourceClickFormat: ClickType;
    eventResourceOnClickMf: string;
    eventResourceOnClickNf: Nanoflow;
    eventResourceOnClickForm: string;
    eventResourceOnClickOpenPageAs: PageLocation;

    eventEntryOnClickAction: FullAction;
    eventEntryClickFormat: ClickType;
    eventEntryOnClickMf: string;
    eventEntryOnClickNf: Nanoflow;
    eventEntryOnClickForm: string;
    eventEntryOnClickOpenPageAs: PageLocation;

    eventEmptyOnClickAction: SimpleAction;
    eventEmptyClickFormat: ClickType;
    eventEmptyOnClickMf: string;
    eventEmptyOnClickNf: Nanoflow;
}

export interface PlannerWidgetContainerProps extends ICommonWidgetProps, PlannerWidgetUIProps, PlannerWidgetEventProps {
    resourceEntity: string;
    resourceDataSource: DataSource;
    resourceConstraint: string;
    resourceGetDataMf: string;
    resourceGetDataNf: Nanoflow;
    resourceTitleType: TitleDataSourceType;
    resourceTitleAttr: string;
    resourceTitleNf: Nanoflow;

    entryEntity: string;
    entryReference: string;
    entryDateAttr: string;

    entryHelperEntity: string;
    entryHelperReference: string;
    entryHelperStartDateAttr: string;
    entryHelperEndDateAttr: string;
    entryDataSource: SimpleDataSource;
    entryGetDataMf: string;
    entryGetDataNf: Nanoflow;

    entryTitleType: TitleDataSourceType;
    entryTitleAttr: string;
    entryTitleNf: Nanoflow;

    viewYearAttr: string;
    viewMonthAttr: string;
}

export interface PlannerWidgetPreviewProps extends PlannerWidgetUIProps {
    class: string;
    style: string;
    styleObject: CSSProperties;
    sampleText?: string;
}

export type VisibilityMap = {
    [P in keyof PlannerWidgetContainerProps]: boolean;
}
