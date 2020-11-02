import { Component, ReactNode, createElement, Fragment } from "react";
import { Moment } from "moment";
import { ClassNameFormatter } from "@bem-react/classname";
import Table, { ColumnProps, TableComponents } from "antd/es/table";
import ReactResizeDetector from "react-resize-detector";

import groupBy from "lodash/groupBy";
import sortBy from "lodash/sortBy";

import { MonthDay } from "../utils/date";
import { getClassNames } from "../utils/classes";
import { ValidationMessage } from "../utils/validation";
import { Alerts } from "./Alerts";
import { RowObject } from "../PlannerWidget";
import { Dimensions, SizeContainer } from "./SizeContainer";
import { ClickType } from "../../typings/PlannerWidgetProps";

export interface PlannerState {
    width?: number;
    height?: number;
    columns: Array<ColumnProps<any>>;
}

export interface PlannerUISettings {
    leftColumnWidth: number;
    cellColumnWidth: number;
    lockLeftColumn: boolean;
    lockHeaderRow: boolean;
    dimensions: Dimensions;
}

export interface PlannerEventSettings {
    onClickResource?: (resourceObj: mendix.lib.MxObject) => void;
    onDoubleClickResource?: (resourceObj: mendix.lib.MxObject) => void;
    onClickEntry?: (entryGuid: string) => void;
    onDoubleClickEntry?: (entryGuid: string) => void;
    onClickEmpty?: (record: RowObject, day: MonthDay) => void;
    onDoubleClickEmpty?: (record: RowObject, day: MonthDay) => void;
}

export interface PlannerProps {
    days: MonthDay[];
    ui: PlannerUISettings;
    events: PlannerEventSettings;
    validation?: {
        messages: ValidationMessage[];
        remove: (id: string) => void;
    };
    isLoading?: boolean;
    rows?: RowObject[];
    rootClassname?: string;
}

interface TableCellProps {
    record: RowObject;
    day: number;
    col: string;
}

class TableCell extends Component<TableCellProps> {
    render(): ReactNode {
        const { children, col, ...restProps } = this.props;

        return (
            <td {...restProps} data-col={col}>
                {children}
            </td>
        );
    }
}

export class Planner extends Component<PlannerProps, PlannerState> {
    private classNames: ClassNameFormatter;
    private scrollToElement?: HTMLDivElement;
    private hasScrolled: boolean;

    constructor(props: PlannerProps) {
        super(props);

        this.classNames = getClassNames(props.rootClassname || "resourcePlanner");
        this.hasScrolled = false;

        this.state = {
            columns: []
        };

        this.renderValidationMessages = this.renderValidationMessages.bind(this);

        this.getChildColumnProps = this.getChildColumnProps.bind(this);
        this.getScrollToRef = this.getScrollToRef.bind(this);
        this.onResizeHandle = this.onResizeHandle.bind(this);

        this.onEntryClickHandler = this.onEntryClickHandler.bind(this);
        this.onResourceClickHandler = this.onResourceClickHandler.bind(this);
    }

    render(): ReactNode {
        const { columns, width, height } = this.state;
        const { rows, isLoading, ui } = this.props;

        const scrollY = ui!.lockHeaderRow ? height || true : false;

        const components: TableComponents = {
            body: {
                cell: TableCell
            }
        };

        return (
            <Fragment>
                {this.renderValidationMessages()}
                <SizeContainer
                    className={this.classNames("wrapper")}
                    width={ui.dimensions.width}
                    height={ui.dimensions.height}
                    widthUnit={ui.dimensions.widthUnit}
                    heightUnit={ui.dimensions.heightUnit}
                >
                    <Table<RowObject>
                        className={this.classNames()}
                        columns={columns}
                        dataSource={rows}
                        loading={isLoading}
                        size="small"
                        scroll={{ x: width || true, y: scrollY }}
                        pagination={false}
                        bordered
                        components={components}
                    />
                    <ReactResizeDetector
                        handleHeight
                        handleWidth
                        refreshMode="throttle"
                        refreshRate={100}
                        onResize={this.onResizeHandle}
                    />
                </SizeContainer>
            </Fragment>
        );
    }

    UNSAFE_componentWillReceiveProps(nextProps: PlannerProps): void {
        this.createColumns(nextProps);
    }

    componentDidUpdate(): void {
        if (this.scrollToElement && this.props.rows && !this.hasScrolled) {
            this.scrollToElement.scrollIntoView({
                behavior: "smooth",
                inline: "center"
            });
            setTimeout(() => {
                this.hasScrolled = true;
            }, 1000);
        }
    }

    private renderValidationMessages(): ReactNode {
        const { validation } = this.props;
        if (!validation || validation.messages.length === 0) {
            return null;
        }
        return (
            <Alerts validationMessages={validation.messages} classNames={this.classNames} remove={validation.remove} />
        );
    }

    private onResizeHandle(width: number, height: number): void {
        if (!!width && !!height) {
            this.setState({
                width,
                height
            });
        }
    }

    private getScrollToRef(node: HTMLDivElement): void {
        this.scrollToElement = node;
    }

    private createColumns(props: PlannerProps): void {
        const { days } = props;
        const columns = this.getColumns(days);
        this.setState({
            columns
        });
    }

    private getColumns(days: MonthDay[]): Array<ColumnProps<RowObject>> {
        const groups = groupBy(days, "groupNum");
        const groupNums = Object.keys(groups).map(key => parseInt(key, 10));

        const columns: Array<ColumnProps<RowObject>> = groupNums.map(groupNum => {
            const week = sortBy(groups[groupNum], monthDay => monthDay.day);
            const firstDayOfWeek = week[0];
            const weekNum = firstDayOfWeek.week;
            const weekEvenUnevenClass = weekNum % 2 === 0 ? "week-even" : "week-uneven";
            const lastDayOfWeek = week[week.length - 1];
            const children = week.map(this.getChildColumnProps);

            const column: ColumnProps<RowObject> = {
                title: this.renderWeekColumnTitle(weekNum, firstDayOfWeek.day, lastDayOfWeek.day),
                children,
                className: this.classNames("weekColumn", {}, [weekEvenUnevenClass])
            };

            return column;
        });

        return [...this.getLeftColumns(), ...columns];
    }

    private getChildColumnProps(monthDay: MonthDay): ColumnProps<RowObject> {
        const { ui, events } = this.props;
        const { onClickEmpty, onClickEntry, onDoubleClickEmpty, onDoubleClickEntry } = events;
        const hasClick = !!onClickEmpty || !!onClickEntry || !!onDoubleClickEntry || !!onDoubleClickEmpty;
        const cellWidth = ui!.cellColumnWidth || 100;
        const dayClass = `weekday-${monthDay.day.format("ddd").toLowerCase()}`;

        return {
            title: this.renderDateColumnTitle(monthDay.day, monthDay.isToday),
            width: cellWidth,
            dataIndex: monthDay.key,
            key: monthDay.key,
            className: this.classNames(
                "dayColumn",
                {
                    today: monthDay.isToday,
                    notInMonth: !monthDay.isThisMonth
                },
                [dayClass]
            ),
            onCell: record => ({
                // col: monthDay.key,
                className: this.classNames(
                    "dayColumn",
                    {
                        today: monthDay.isToday,
                        notInMonth: !monthDay.isThisMonth,
                        clickable: hasClick && monthDay.isThisMonth
                    },
                    [dayClass]
                ),
                onClick: () => {
                    if (record && record._references && monthDay && monthDay.isThisMonth) {
                        this.onEntryClickHandler("single", record, monthDay);
                    }
                },
                onDoubleClick: () => {
                    if (record && record._references && monthDay && monthDay.isThisMonth) {
                        this.onEntryClickHandler("double", record, monthDay);
                    }
                },
                onMouseEnter: evt => {
                    const target = evt.target as HTMLTableDataCellElement;
                    if (target && target.classList && target.className.indexOf("hover-cell") === -1) {
                        target.classList.add("hover-cell");
                    }
                },
                onMouseLeave: evt => {
                    const target = evt.target as HTMLTableDataCellElement;
                    if (target && target.classList && target.className.indexOf("hover-cell") !== -1) {
                        target.classList.remove("hover-cell");
                    }
                }
            })
        };
    }

    private onEntryClickHandler(type: ClickType, record: RowObject, monthDay: MonthDay): void {
        const entryRef = record._references ? record._references[monthDay.key] : null;
        const { onClickEmpty, onClickEntry, onDoubleClickEmpty, onDoubleClickEntry } = this.props.events;

        if (type === "single") {
            if (typeof entryRef !== "undefined" && entryRef !== null && onClickEntry) {
                onClickEntry(entryRef);
            } else if (onClickEmpty) {
                onClickEmpty(record, monthDay);
            }
        } else {
            if (typeof entryRef !== "undefined" && entryRef !== null && onDoubleClickEntry) {
                onDoubleClickEntry(entryRef);
            } else if (onDoubleClickEmpty) {
                onDoubleClickEmpty(record, monthDay);
            }
        }
    }

    private onResourceClickHandler(type: ClickType, record: RowObject): void {
        const { onClickResource, onDoubleClickResource } = this.props.events;

        if (type === "single" && onClickResource) {
            onClickResource(record._mxObj);
        } else if (type === "double" && onDoubleClickResource) {
            onDoubleClickResource(record._mxObj);
        }
    }

    private getLeftColumns(): Array<ColumnProps<RowObject>> {
        const { onClickResource } = this.props.events;

        const { ui } = this.props;
        const leftWidth = ui!.leftColumnWidth || 200;
        const leftFixed = ui!.lockLeftColumn;

        return [
            {
                title: "",
                className: this.classNames("firstColumn", {
                    clickable: !!onClickResource
                }),
                dataIndex: "resource",
                key: "resource",
                width: leftWidth,
                fixed: leftFixed ? "left" : false,
                onCell: record => ({
                    onClick: () => {
                        if (record && record._mxObj) {
                            this.onResourceClickHandler("single", record);
                        }
                    },
                    onDoubleClick: () => {
                        if (record && record._mxObj) {
                            this.onResourceClickHandler("double", record);
                        }
                    },
                    onMouseEnter: evt => {
                        const target = evt.target as HTMLTableDataCellElement;
                        if (target && target.classList) {
                            target.classList.add("hover-cell");
                        }
                    },
                    onMouseLeave: evt => {
                        const target = evt.target as HTMLTableDataCellElement;
                        if (target && target.classList) {
                            target.classList.remove("hover-cell");
                        }
                    }
                })
            }
        ];
    }

    private renderDateColumnTitle(day: Moment, isToday: boolean): ReactNode {
        const noop = (): void => {};
        return (
            <div className={this.classNames("dayIndicator")} ref={isToday ? this.getScrollToRef : noop}>
                <div className={this.classNames("dayIndicator__day")}>{day.format("ddd")}</div>
                <div className={this.classNames("dayIndicator__num")}>{day.date()}</div>
            </div>
        );
    }

    private renderWeekColumnTitle(weekNum: number, begin: Moment, end: Moment): ReactNode {
        const title = `week ${weekNum}: ${begin.format("DD MMM")} - ${end.format("DD MMM")}`;
        return <div className={this.classNames("weekIndicator")}>{title}</div>;
    }
}
