import { Component, ReactNode, createElement } from "react";
import { Planner, PlannerUISettings, PlannerEventSettings } from "./components/Planner";
import { PlannerWidgetContainerProps, VisibilityMap } from "../typings/PlannerWidgetProps";
import { getToday, getMonth } from "./utils/date";

declare function require(name: string): string;

export class preview extends Component<PlannerWidgetContainerProps> {
    render(): ReactNode {
        const today = getToday();
        const days = getMonth(today.month() + 1, today.year());

        const uiSettings: PlannerUISettings = {
            leftColumnWidth: this.props.tableLeftColumnWidth,
            cellColumnWidth: this.props.tableCellColumnWidth,
            lockLeftColumn: this.props.tableLockLeftColumn,
            lockHeaderRow: this.props.tableLockHeaderRow,
            dimensions: {
                height: this.props.height,
                width: this.props.width,
                heightUnit: this.props.heightUnit,
                widthUnit: this.props.widthUnit
            },
            scrollToToday: false
        };

        const events: PlannerEventSettings = {};

        return <Planner days={days} ui={uiSettings} events={events} />;
    }
}

export function getPreviewCss(): string {
    return require("./ui/PlannerWidget.scss");
}

export function getVisibleProperties(props: PlannerWidgetContainerProps, visibilityMap: VisibilityMap): VisibilityMap {
    visibilityMap.resourceConstraint = props.resourceDataSource === "xpath";
    visibilityMap.resourceGetDataMf = props.resourceDataSource === "mf";
    visibilityMap.resourceGetDataNf = props.resourceDataSource === "nf";

    visibilityMap.resourceTitleAttr = props.resourceTitleType === "attribute";
    visibilityMap.resourceTitleNf = props.resourceTitleType === "nanoflow";

    visibilityMap.entryTitleAttr = props.entryTitleType === "attribute";
    visibilityMap.entryTitleNf = props.entryTitleType === "nanoflow";

    visibilityMap.entryGetDataMf = props.entryDataSource === "mf";
    visibilityMap.entryGetDataNf = props.entryDataSource === "nf";

    visibilityMap.eventResourceClickFormat = props.eventResourceOnClickAction !== "nothing";
    visibilityMap.eventResourceOnClickMf = props.eventResourceOnClickAction === "mf";
    visibilityMap.eventResourceOnClickNf = props.eventResourceOnClickAction === "nf";
    visibilityMap.eventResourceOnClickForm = visibilityMap.eventResourceOnClickOpenPageAs =
        props.eventResourceOnClickAction === "open";

    visibilityMap.eventEntryClickFormat = props.eventEntryOnClickAction !== "nothing";
    visibilityMap.eventEntryOnClickMf = props.eventEntryOnClickAction === "mf";
    visibilityMap.eventEntryOnClickNf = props.eventEntryOnClickAction === "nf";
    visibilityMap.eventEntryOnClickForm = visibilityMap.eventEntryOnClickOpenPageAs =
        props.eventEntryOnClickAction === "open";

    visibilityMap.eventEmptyClickFormat = props.eventEmptyOnClickAction !== "nothing";
    visibilityMap.eventEmptyOnClickMf = props.eventEmptyOnClickAction === "mf";
    visibilityMap.eventEmptyOnClickNf = props.eventEmptyOnClickAction === "nf";

    return visibilityMap;
}
