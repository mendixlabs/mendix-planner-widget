import { Component, ReactNode, createElement } from "react";
import { findDOMNode } from "react-dom";
import moment from "moment";
import findIndex from "lodash/findIndex";

import { Planner, PlannerUISettings, PlannerEventSettings } from "./components/Planner";
import { PlannerWidgetContainerProps, Nanoflow } from "../typings/PlannerWidgetProps";

export interface RowObject {
    key: string;
    resource: string | ReactNode;
    _mxObj: mendix.lib.MxObject;
    _references: {
        [key: string]: string;
    };
    [other: string]: any;
}

export interface PlannerWidgetState {
    rows: RowObject[];
    days: MonthDay[];
    isLoading: boolean;
    validationMessages: ValidationMessage[];
}

interface EntryRawObject {
    date?: Date;
    title?: string | ReactNode;
    ref?: string;
    guid: string;
    dateKey?: string;
}

import {
    IAction,
    executeMicroflow,
    executeNanoFlow,
    openPage,
    getObjectContext,
    fetchAttr,
    createObject,
    commitObject,
    getObject
} from "@jeltemx/mendix-react-widget-utils";

import "./ui/PlannerWidget.scss";
import { MonthDay, getDateKey, getMonth } from "./utils/date";
import { TypeValidationSeverity, ValidationMessage, validateProps } from "./utils/validation";
import { TemplateComponent } from "./components/TemplateComponent";

class PlannerWidget extends Component<PlannerWidgetContainerProps, PlannerWidgetState> {
    private widgetId?: string;
    private subscriptionHandles: number[] = [];
    private entryReference: null | string = null;
    private entryHelperReference: null | string = null;

    constructor(props: PlannerWidgetContainerProps) {
        super(props);

        const validationMessages = validateProps(props);

        this.state = {
            rows: [],
            days: [],
            isLoading: true,
            validationMessages
        };

        const { entryReference, entryHelperReference } = props;

        const refParts = entryReference ? entryReference.split("/") : [];
        if (refParts && refParts.length > 0) {
            this.entryReference = refParts[0];
        }

        const refHelperParts = entryHelperReference ? entryHelperReference.split("/") : [];
        if (refHelperParts && refHelperParts.length > 0) {
            this.entryHelperReference = refHelperParts[0];
        }

        this.bindActions();
    }

    private bindActions(): void {
        this.showMendixError = this.showMendixError.bind(this);
        this.switchLoader = this.switchLoader.bind(this);
        this.executeAction = this.executeAction.bind(this);

        this.onClickResource = this.onClickResource.bind(this);
        this.onDoubleClickResource = this.onDoubleClickResource.bind(this);
        this.onClickEntry = this.onClickEntry.bind(this);
        this.onDoubleClickEntry = this.onDoubleClickEntry.bind(this);
        this.onClickEmpty = this.onClickEmpty.bind(this);
        this.onDoubleClickEmpty = this.onDoubleClickEmpty.bind(this);

        this.handleResourceSubscription = this.handleResourceSubscription.bind(this);
        this.handleEntrySubscription = this.handleEntrySubscription.bind(this);
        this.getRowObjectFromResource = this.getRowObjectFromResource.bind(this);
        this.addValidationMessage = this.addValidationMessage.bind(this);
        this.removeValidationMessage = this.removeValidationMessage.bind(this);
    }

    render(): ReactNode {
        const { rows, days, isLoading, validationMessages } = this.state;

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
            scrollToToday: this.props.scrollToToday
        };

        const events: PlannerEventSettings = {
            onClickResource: this.onClickResource,
            onDoubleClickResource: this.onDoubleClickResource,
            onClickEntry: this.onClickEntry,
            onDoubleClickEntry: this.onDoubleClickEntry,
            onClickEmpty: this.onClickEmpty,
            onDoubleClickEmpty: this.onDoubleClickEmpty
        };

        const validation = {
            messages: validationMessages,
            remove: this.removeValidationMessage
        };

        return (
            <Planner
                days={days}
                isLoading={isLoading}
                rows={rows}
                ui={uiSettings}
                events={events}
                validation={validation}
            />
        );
    }

    UNSAFE_componentWillReceiveProps(nextProps: PlannerWidgetContainerProps): void {
        if (!this.widgetId) {
            const domNode = findDOMNode(this) as Element;
            this.widgetId = domNode.getAttribute("widgetId") || undefined;
        }
        this.resetSubscription(nextProps.mxObject);
        this.setState({ isLoading: true }, () => {
            this.fetchResources(nextProps.mxObject);
        });
    }

    componentDidUpdate(): void {
        if (this.widgetId) {
            const domNode = findDOMNode(this) as Element;
            if (domNode) {
                domNode.setAttribute("widgetId", this.widgetId);
            }
        }
    }

    componentWillUnmount(): void {
        if (this.subscriptionHandles) {
            this.subscriptionHandles.forEach(window.mx.data.unsubscribe);
        }
    }

    private async onClickResource(resourceObj: mendix.lib.MxObject): Promise<void> {
        if (this.props.eventResourceOnClickAction === "nothing" || this.props.eventResourceClickFormat === "double") {
            return;
        }
        return this.onClickResourceHandler(resourceObj);
    }

    private async onDoubleClickResource(resourceObj: mendix.lib.MxObject): Promise<void> {
        if (this.props.eventResourceOnClickAction === "nothing" || this.props.eventResourceClickFormat === "single") {
            return;
        }
        return this.onClickResourceHandler(resourceObj);
    }

    private async onClickEntry(entryGuid: string): Promise<void> {
        if (this.props.eventEntryOnClickAction === "nothing" || this.props.eventEntryClickFormat === "double") {
            return;
        }
        return this.onClickEntryHandler(entryGuid);
    }

    private async onDoubleClickEntry(entryGuid: string): Promise<void> {
        if (this.props.eventEntryOnClickAction === "nothing" || this.props.eventEntryClickFormat === "single") {
            return;
        }
        return this.onClickEntryHandler(entryGuid);
    }

    private async onClickEmpty(record: RowObject, day: MonthDay): Promise<void> {
        if (this.props.eventEmptyOnClickAction === "nothing" || this.props.eventEmptyClickFormat === "double") {
            return;
        }
        return this.onClickEmptyHandler(record, day);
    }

    private async onDoubleClickEmpty(record: RowObject, day: MonthDay): Promise<void> {
        if (this.props.eventEmptyOnClickAction === "nothing" || this.props.eventEmptyClickFormat === "single") {
            return;
        }
        return this.onClickEmptyHandler(record, day);
    }

    private async onClickEmptyHandler(record: RowObject, day: MonthDay): Promise<void> {
        const helperObject = await this.createEntryHelperObject([record], [day]);
        if (!helperObject) {
            return;
        }
        if (this.props.eventEmptyOnClickAction === "mf" && this.props.eventEmptyOnClickMf && helperObject) {
            this.executeAction({ microflow: this.props.eventEmptyOnClickMf }, true, helperObject);
        } else if (
            this.props.eventEmptyOnClickAction === "nf" &&
            this.props.eventEmptyOnClickNf &&
            this.props.eventEmptyOnClickNf.nanoflow &&
            helperObject
        ) {
            this.executeAction({ nanoflow: this.props.eventEmptyOnClickNf }, true, helperObject);
        }
    }

    private async onClickResourceHandler(resourceObj: mendix.lib.MxObject): Promise<void> {
        if (!resourceObj) {
            return;
        }
        if (this.props.eventResourceOnClickAction === "mf" && this.props.eventResourceOnClickMf && resourceObj) {
            this.executeAction({ microflow: this.props.eventResourceOnClickMf }, true, resourceObj);
        } else if (
            this.props.eventResourceOnClickAction === "nf" &&
            this.props.eventResourceOnClickNf &&
            this.props.eventResourceOnClickNf.nanoflow &&
            resourceObj
        ) {
            this.executeAction({ nanoflow: this.props.eventResourceOnClickNf }, true, resourceObj);
        } else if (this.props.eventResourceOnClickAction === "open" && resourceObj) {
            this.executeAction(
                {
                    page: {
                        openAs: this.props.eventResourceOnClickOpenPageAs,
                        pageName: this.props.eventResourceOnClickForm
                    }
                },
                true,
                resourceObj
            );
        }
    }

    private async onClickEntryHandler(entryGuid: string): Promise<void> {
        const entryObj = await getObject(entryGuid);
        if (!entryObj) {
            return;
        }
        if (this.props.eventEntryOnClickAction === "mf" && this.props.eventEntryOnClickMf && entryObj) {
            this.executeAction({ microflow: this.props.eventEntryOnClickMf }, true, entryObj);
        } else if (
            this.props.eventEntryOnClickAction === "nf" &&
            this.props.eventEntryOnClickNf &&
            this.props.eventEntryOnClickNf.nanoflow &&
            entryObj
        ) {
            this.executeAction({ nanoflow: this.props.eventEntryOnClickNf }, true, entryObj);
        } else if (this.props.eventEntryOnClickAction === "open" && entryObj) {
            this.executeAction(
                {
                    page: { openAs: this.props.eventEntryOnClickOpenPageAs, pageName: this.props.eventEntryOnClickForm }
                },
                true,
                entryObj
            );
        }
    }

    private clearSubscriptions(): void {
        const { unsubscribe } = window.mx.data;

        if (this.subscriptionHandles && this.subscriptionHandles.length > 0) {
            this.subscriptionHandles.forEach(unsubscribe);
            this.subscriptionHandles = [];
        }
    }

    private resetSubscription(mxObject?: mendix.lib.MxObject): void {
        this.debug("resetSubscriptions");

        const { subscribe } = window.mx.data;
        const { rows } = this.state;

        this.clearSubscriptions();

        if (mxObject && mxObject.getGuid) {
            this.subscriptionHandles.push(
                subscribe({
                    callback: () => {
                        this.debug("subscription: context");
                        this.clearSubscriptions();
                        this.setState({ isLoading: true }, () => {
                            this.fetchResources(mxObject);
                        });
                    },
                    guid: mxObject.getGuid()
                })
            );
        }

        if (rows && rows.length > 0) {
            rows.forEach(row => {
                this.subscriptionHandles.push(
                    subscribe({
                        callback: () => {
                            this.handleResourceSubscription(row);
                        },
                        guid: row._mxObj.getGuid()
                    })
                );
                if (row._references) {
                    Object.keys(row._references).forEach(key => {
                        const entryGuid = row._references[key];
                        this.subscriptionHandles.push(
                            subscribe({
                                callback: () => {
                                    this.handleEntrySubscription(entryGuid, row);
                                },
                                guid: entryGuid
                            })
                        );
                    });
                }
            });
        }
    }

    private async handleEntrySubscription(entryGuid: string, row: RowObject): Promise<void> {
        this.debug("handleEntrySubscription", entryGuid, row);

        const { rows } = this.state;
        const resourcesToReload = [row._mxObj.getGuid()];

        try {
            const entry = await getObject(entryGuid);
            if (entry && this.entryReference) {
                const ref = entry.getReference(this.entryReference);

                // We check if the entry changed to another resource;
                if (ref && ref !== row._mxObj.getGuid()) {
                    // Check if resource exists in the scope;
                    const filteredRows = rows.filter(row => row._mxObj.getGuid() === ref);

                    if (filteredRows && filteredRows.length === 1) {
                        resourcesToReload.push(ref);
                    }
                }
            }
            this.reloadResources(resourcesToReload);
        } catch (error) {
            this.showMendixError(`handle Entry change ${entryGuid}`, error);
        }
    }

    private async handleResourceSubscription(row: RowObject): Promise<void> {
        this.debug("handleResourceSubscription", row);

        const obj = await getObject(row._mxObj.getGuid());

        if (obj !== null) {
            this.reloadResources([row._mxObj.getGuid()]);
        } else {
            // Object is deleted
            const { rows } = this.state;
            const filteredRows = rows.filter(stateRow => stateRow.key !== row.key);
            this.setState(
                {
                    rows: filteredRows
                },
                () => this.resetSubscription()
            );
        }
    }

    private async reloadResources(guids: string[]): Promise<void> {
        this.debug("reloadResources", guids);

        await this.switchLoader(true);

        try {
            const { rows } = this.state;
            const copiedRows = [...rows];
            const reloadedResources = await Promise.all(guids.map(guid => getObject(guid)));
            const filteredResources = reloadedResources.filter(res => res !== null) as mendix.lib.MxObject[];
            const newRows = await Promise.all(filteredResources.map(this.getRowObjectFromResource));
            const replaceRows = await this.getEntries(newRows, false);

            replaceRows.forEach(replaceRow => {
                const copyRowIndex = findIndex(copiedRows, row => row.key === replaceRow.key);
                if (copyRowIndex !== -1) {
                    copiedRows.splice(copyRowIndex, 1, replaceRow);
                }
            });

            this.setState(
                {
                    rows: copiedRows,
                    isLoading: false
                },
                () => {
                    this.resetSubscription();
                }
            );
        } catch (error) {
            this.switchLoader(false);
            this.clearSubscriptions();
            this.showMendixError(`reloading resources ${guids}`, error);
        }
    }

    private async fetchResources(mxObject?: mendix.lib.MxObject): Promise<void> {
        await this.createDays();

        const hasFatalErrors = this.state.validationMessages.filter(msg => msg.fatal).length > 0;

        if (hasFatalErrors) {
            this.setState({
                rows: [],
                isLoading: false
            });
            return;
        }

        if (this.props.resourceDataSource === "xpath" && this.props.resourceEntity && mxObject) {
            this.fetchResourcesByXpath(mxObject);
        } else if (this.props.resourceDataSource === "mf" && this.props.resourceGetDataMf && mxObject) {
            this.fetchResourcesByMf(this.props.resourceGetDataMf, mxObject);
        } else if (this.props.resourceDataSource === "nf" && this.props.resourceGetDataNf && mxObject) {
            this.fetchResourcesByNf(this.props.resourceGetDataNf, mxObject);
        } else {
            this.switchLoader(false);
        }
    }

    private async createDays(): Promise<void> {
        if (!this.props.mxObject) {
            return;
        }
        const year = (await fetchAttr(this.props.mxObject, this.props.viewYearAttr)) as number;
        const month = (await fetchAttr(this.props.mxObject, this.props.viewMonthAttr)) as number;
        const days = getMonth(parseInt(`${month.valueOf()}`, 10), parseInt(`${year.valueOf()}`, 10));
        this.setState({
            days
        });
    }

    private fetchResourcesByXpath(mxObject: mendix.lib.MxObject): void {
        this.debug("fetchResourcesByXpath", mxObject);
        const { resourceConstraint } = this.props;
        const requiresContext = resourceConstraint && resourceConstraint.indexOf("[%CurrentObject%]") > -1;
        const contextGuid = mxObject.getGuid();

        if (!contextGuid && requiresContext) {
            this.setState({ isLoading: false });
            return;
        }

        const entityConstraint = resourceConstraint
            ? resourceConstraint.replace(/\[%CurrentObject%]/g, contextGuid)
            : "";

        window.mx.data.get({
            callback: mxObjects => this.handleResourceData(mxObjects),
            error: error =>
                this.addValidationMessage(
                    `An error occurred while retrieving items via XPath (${entityConstraint}): ${error}`,
                    "warning"
                ),
            xpath: `//${this.props.resourceEntity}${entityConstraint}`
        });
    }

    private fetchResourcesByMf(microflow: string, object: mendix.lib.MxObject): void {
        const action: IAction = {
            microflow
        };
        this.executeAction(action, true, object).then((mxObjects: mendix.lib.MxObject[]) =>
            this.handleResourceData(mxObjects)
        );
    }

    private fetchResourcesByNf(nanoflow: Nanoflow, object: mendix.lib.MxObject): void {
        const action: IAction = {
            nanoflow
        };
        this.executeAction(action, true, object).then((mxObjects: mendix.lib.MxObject[]) =>
            this.handleResourceData(mxObjects)
        );
    }

    private handleResourceData(mxObjects: mendix.lib.MxObject[]): Promise<void> {
        this.debug("handleResourceData", mxObjects!.length);
        return Promise.all(mxObjects.map(this.getRowObjectFromResource))
            .then(rows => this.getEntries(rows))
            .then(() => {})
            .catch(error => {
                this.setState(
                    {
                        isLoading: false,
                        rows: []
                    },
                    () => this.addValidationMessage(`An error occurred while handling resources: ${error}`, "warning")
                );
            });
    }

    private async getRowObjectFromResource(resourceObj: mendix.lib.MxObject): Promise<RowObject> {
        const maxWidth = this.props.tableLeftColumnWidth - 20;
        let titleText = "";

        if (this.props.resourceTitleType === "attribute" && this.props.resourceTitleAttr) {
            titleText = (await fetchAttr(resourceObj, this.props.resourceTitleAttr)) as string;
        } else if (
            this.props.resourceTitleType === "nanoflow" &&
            this.props.resourceTitleNf &&
            this.props.resourceTitleNf.nanoflow
        ) {
            titleText = (await this.executeAction(
                { nanoflow: this.props.resourceTitleNf },
                false,
                resourceObj
            )) as string;
        }

        const title = <TemplateComponent style={{ maxWidth }} className={"firstColumn__text"} template={titleText} />;

        const rowObject: RowObject = {
            key: resourceObj.getGuid(),
            resource: title,
            _references: {},
            _mxObj: resourceObj
        };

        return rowObject;
    }

    private async getEntries(rowObjects: RowObject[], setRowState = true): Promise<RowObject[]> {
        this.debug("getEntries", rowObjects.length);
        if (!rowObjects || rowObjects.length === 0) {
            if (setRowState) {
                this.setState({
                    rows: rowObjects,
                    isLoading: false
                });
            }
            return [];
        }

        let finalRowObjects: RowObject[] = rowObjects;

        const action: IAction = {};

        if (this.props.entryDataSource === "mf" && this.props.entryGetDataMf !== "") {
            action.microflow = this.props.entryGetDataMf;
        } else if (this.props.entryDataSource === "nf" && this.props.entryGetDataNf!.nanoflow) {
            action.nanoflow = this.props.entryGetDataNf;
        }

        try {
            if (action.microflow || action.nanoflow) {
                const helperObject = await this.createEntryHelperObject(rowObjects);
                const entries = (await this.executeAction(action, true, helperObject)) as mendix.lib.MxObject[];

                if (entries && entries.length) {
                    finalRowObjects = await this.handleEntries(rowObjects, entries);
                }
            }
        } catch (error) {
            finalRowObjects = [];
            if (setRowState) {
                this.setState(
                    {
                        isLoading: false,
                        rows: []
                    },
                    () => this.addValidationMessage(`An error occurred while handling entries: ${error}`, "warning")
                );
            }
            return [];
        }

        if (setRowState) {
            this.setState(
                {
                    rows: finalRowObjects,
                    isLoading: false
                },
                () => {
                    this.resetSubscription(this.props.mxObject);
                }
            );
        }

        return finalRowObjects;
    }

    private handleEntries(rowObjects: RowObject[], entries: mendix.lib.MxObject[]): Promise<RowObject[]> {
        this.debug("handleEntries", rowObjects.length, entries.length);

        return new Promise((resolve, reject) => {
            Promise.all(
                entries.map(async entry => {
                    const date = (await fetchAttr(entry, this.props.entryDateAttr)) as Date;

                    let title: string | ReactNode = "{entry}";

                    if (this.props.entryTitleType === "attribute" && this.props.entryTitleAttr) {
                        const titleText = (await fetchAttr(entry, this.props.entryTitleAttr)) as string;
                        title = <TemplateComponent className={"entryTitle"} template={titleText} />;
                    } else if (
                        this.props.entryTitleType === "nanoflow" &&
                        this.props.entryTitleNf &&
                        this.props.entryTitleNf.nanoflow
                    ) {
                        const titleText = (await this.executeAction(
                            { nanoflow: this.props.entryTitleNf },
                            false,
                            entry
                        )) as string;
                        title = <TemplateComponent className={"entryTitle"} template={titleText} />;
                    }

                    const dateObj: EntryRawObject = {
                        date,
                        title,
                        guid: entry.getGuid()
                    };

                    if (this.entryReference !== null) {
                        const reference = entry.getReference(this.entryReference);
                        dateObj.ref = reference;
                    }

                    const dateMoment = moment(date);

                    if (dateMoment.isValid()) {
                        const dateKey = getDateKey(dateMoment);
                        dateObj.dateKey = dateKey;
                    }

                    return dateObj;
                })
            )
                .then(async entryVals => {
                    const newRowObjects = rowObjects.map(rowObject => {
                        const newRowbject = { ...rowObject };
                        const filteredEntries = entryVals.filter(eV => eV.ref && eV.ref === newRowbject.key);
                        if (filteredEntries.length > 0) {
                            filteredEntries.forEach(fEntry => {
                                if (fEntry.dateKey && fEntry.title) {
                                    newRowbject._references[fEntry.dateKey] = fEntry.guid;
                                    newRowbject[fEntry.dateKey] = fEntry.title;
                                }
                            });
                        }
                        return newRowbject;
                    });
                    resolve(newRowObjects);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    private async createEntryHelperObject(
        rowObjects: RowObject[],
        monthDays: MonthDay[] = []
    ): Promise<mendix.lib.MxObject> {
        const { entryHelperEntity, entryHelperStartDateAttr, entryHelperEndDateAttr } = this.props;

        const { days } = this.state;
        const filteredDays = days.filter(monthDay => monthDay.isThisMonth);
        const daysArray = monthDays && monthDays.length > 0 ? monthDays : filteredDays;

        const obj = await createObject(entryHelperEntity);

        if (this.entryHelperReference !== null && rowObjects.length > 0) {
            const guids: string[] = rowObjects
                .map(r => (r._mxObj ? r._mxObj.getGuid() : null))
                .filter(s => s !== null) as string[];
            obj.addReferences(this.entryHelperReference, guids);
        }

        if (entryHelperStartDateAttr && daysArray.length > 0) {
            const startDate = daysArray[0].day.toDate();
            obj.set(entryHelperStartDateAttr, startDate);
        }

        if (entryHelperEndDateAttr && daysArray.length > 0) {
            const startDate = daysArray[daysArray.length - 1].day.toDate();
            obj.set(entryHelperEndDateAttr, startDate);
        }

        await commitObject(obj);

        return obj;
    }

    private switchLoader(state: boolean): Promise<void> {
        return new Promise(resolve => {
            this.setState(
                {
                    isLoading: state
                },
                resolve
            );
        });
    }

    /**
     * Get a new context, used for actions
     *
     * @name getContext
     * @memberof WidgetBase
     * @param obj Mendix Object (optional)
     */
    private getContext(obj?: mendix.lib.MxObject): mendix.lib.MxContext {
        if (obj && obj.getGuid) {
            return getObjectContext(obj);
        } else if (this.props.mxObject) {
            return getObjectContext(this.props.mxObject);
        }

        return new window.mendix.lib.MxContext();
    }

    /**
     * Execute an Action as a Promise
     *
     * @name executeAction
     * @memberof WidgetBase
     * @param action Action contains a microflow/nanoflow/page
     * @param showError When an error occurs in the executed action, show it using `mx.ui.error`
     * @param obj Optional: Mendix object. If this is omitted, it will assume to use the context object of the widget
     */
    private executeAction(
        action: IAction,
        showError = false,
        obj?: mendix.lib.MxObject
    ): Promise<string | number | boolean | mendix.lib.MxObject | mendix.lib.MxObject[] | void> {
        this.debug("executeAction", action, obj && obj.getGuid());
        const { mxform } = this.props;
        const context = this.getContext(obj);

        if (action.microflow) {
            return executeMicroflow(action.microflow, context, mxform, showError);
        } else if (action.nanoflow) {
            return executeNanoFlow(action.nanoflow, context, mxform, showError);
        } else if (action.page) {
            return openPage(action.page, context, showError);
        }

        return Promise.reject(
            new Error(`No microflow/nanoflow/page defined for this action: ${JSON.stringify(action)}`)
        );
    }

    /**
     * Log messages in your widget for debugging. Uses the Mendix logger (set to loglevel.DEBUG)
     *
     * @name debug
     * @memberof WidgetBase
     * @param args Arguments to pass down the Mendix Logger
     */
    private debug(...args: any): void {
        const id = this.props.friendlyId || this.widgetId;
        if (window.logger) {
            window.logger.debug(`${id}:`, ...args);
        }
    }

    /**
     * Show Mendix error
     *
     * @param actionName Identify the action where this takes place
     * @param error Generic error
     */
    private showMendixError(actionName: string, error: Error): void {
        if (error && error.message) {
            window.mx.ui.error(`An error occured in ${actionName} :: ${error.message}`);
        }
    }

    private addValidationMessage(message: string, type: TypeValidationSeverity = "warning"): void {
        const messages = [...this.state.validationMessages];
        const newValidationMessage = new ValidationMessage(message, type);
        this.setState({
            validationMessages: [newValidationMessage, ...messages]
        });
    }

    private removeValidationMessage(id: string): void {
        const { validationMessages } = this.state;
        const messages = [...validationMessages].filter(message => message.id !== id);
        this.setState({
            validationMessages: messages
        });
    }
}

export default PlannerWidget;
