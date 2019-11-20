[![Dependencies](https://david-dm.org/JelteMX/mendix-planner-widget.svg)]([https://david-dm.org/JelteMX/mendix-planner-widget](https://david-dm.org/JelteMX/mendix-planner-widget))
[![DevDependencies](https://david-dm.org/JelteMX/mendix-planner-widget/dev-status.svg)]([https://david-dm.org/JelteMX/mendix-planner-widget?type=dev](https://david-dm.org/JelteMX/mendix-planner-widget?type=dev))
[![Support](https://img.shields.io/badge/Support-Community%20(no%20active%20support)-orange.svg)](https://docs.mendix.com/developerportal/app-store/app-store-content-support)
[![Studio](https://img.shields.io/badge/Studio%20version-8.0%2B-blue.svg)](https://appstore.home.mendix.com/link/modeler/)
![GitHub release](https://img.shields.io/github/release/JelteMX/mendix-planner-widget)
![GitHub issues](https://img.shields.io/github/issues/JelteMX/mendix-planner-widget)

# PlannerWidget

Mendix Planner Widget using [Ant Design Table](https://ant.design/components/table/) (MIT License)

![AppStore](/assets/AppStoreIcon.png)

Show a planning for resources on specific dates

![screenshot](/assets/screenshot.png)

> Note: This widget is under construction and can be used as the basis for other planner widgets. There is a TODO list on the bottom with ideas to implement. Feel free to make changes, the widget is released under the Apache 2 license.

## Features

- Show a full month based on the year- and month number (context object attribute)
- Load a list of resources to display using XPath/Microflow/Nanoflow
- Do 1 call (Microflow/Nanoflow) to load all the entries for the month
- Click/Double click on Resource/Entry to execute a microflow/nanoflow or open a page/popup
- Use HTML to do advanced markup for Entries and your Resource title, using a Nanoflow
- The widget is subscribed to all viewable objects, meaning it will automatically update the view when an object changes
- Mendix Studio compatible (some features like setting an Entity might not be editable in Mendix Studio, you will need Mendix Studio Pro for that)

## Usage

> This is an example use case. This corresponds to the [Online Demo](https://planningwidgettest-sandbox.mxapps.io/)

### Data Model

Consider the following data model:

![data-model](/assets/datamodel.png)

- **DummyView** is used as the context object and has two relevant integers, Year and Month, used for the planner
- **Resource** is the Company that is displayed on the first column of the rows. Title can be used, but we can also use a Nanoflow to show more data (see below);
- **PlanningEntry** is the entry that references to the Resource. An entry has a specific non-localized Date that is used to determine on which day it takes place. Title can be used to display, but we can also use a Nanoflow
- **PlannerGetEntryHelper** is a helper object that is needed to get all the entries for a specific month. The widget will fill in the start- and enddate and use the reference set to determine which entries it will load for which resources

### 1. Resources

![settings resources](/assets/settings_1_resources.png)

- For the rows you will define a Resource entity
- This can be over XPath/Microflow/Nanoflow
- The title can be set to an attribute, or a Nanoflow (returning a string). It can be HTML and will be rendered as such, but you have limited capabilties. The widget will do some sanitizing, but make sure you do not open yourself up to XSS, so when using some kind of user input, make sure it is sanitized server-side

### 2. Entries

![settings entries](/assets/settings_2_entries.png)

#### 2.1 Entity
- Define the Entry entity. It is important to set the reference back to the Resource entity

> Note that the widget (**currently**) only supports 1 entry per day per resource. If you return multiple, it will use the latest. This is all done in the widget. In a future release we might be able to add the capability of using more than 1. Also, currently an Entry is tied to a certain date, in the future this might become a date range.

#### 2.2 Helper
- Entry Helper entity, as explained in Data Model, is used to retrieve Entry objects.

#### 2.3 UI
- For the title of the entry, see the explanation on Resource titles, the same applies here.

### 3. View

![settings view](/assets/settings_3_view.png)

- For viewing a specific month, please refer to the two attributes for Year and Month. It should be noted that the developer has to make sure the Month attribute is bigger than 0 (so start at 1) and smaller than 13 (so end with 12).

### 4. UI Settings

![settings ui](/assets/settings_4_uisettings.png)

#### 4.1 Widths

- The left column and the cell width can be set to a specific width. This is necessary in the table to make sure header row and left column sync up to the content. This cannot be made responsive (unfortunately)

#### 4.2 Locking

- The left column and the header row can be locked, meaning it will stay visible while scrolling. This is enabled by default, but can be switched off when there are issues (notably IE 11 and scrollbars might be an issue)

#### 4.3 Size

- The widget can be sized in various ways. Using flexbox it is even possible to make the table page wide (and keep the left column/top bar locked)

### 5. Events

![settings events](/assets/settings_5_events.png)

- For both the Resource (left most column) as well as Entry you can define an on-click action, opening a page or executing a microflow/nanoflow
- When clicking on an empty spot, you can execute a nanoflow/microflow. This will use the Entry Helper Entity to set a specific date and resource reference, so you can create your own Entry object

## Demo project

You can find the demo here: [https://planningwidgettest-sandbox.mxapps.io/](https://planningwidgettest-sandbox.mxapps.io/)

I might release a demo project as download later on (right now that is not in shape yet)

## Issues, suggestions and feature requests

Please report your issues/suggestion/requests on [Github](https://github.com/JelteMX/mendix-planner-widget/issues)

## TODO

- Show multiple entries on 1 date
- Add ability to control class name on entry
- Refactor class names
- Add Tree structure to show underlying entries

## License

Apache-2
