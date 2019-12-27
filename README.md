# angular-initializer

[![MIT license](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/jaythomas/angular-initializer/blob/master/LICENSE.md)

Structure a component dependency tree out of your legacy angularjs components.
This allows for easier sharing of providers across multiple angular apps, unit testing a provider without needing to build the entire app, and simply incorporating legacy code into a newer app.

- [Installation](#installation)
- [Example](#example)
- [What's it do exactly?](#whats-it-do-exactly)
- [Caveats](#caveats)
- [Provider API](#provider-api)
  - [Components](#components)
  - [Directives](#directives)
  - [Configs and Run files](#configs-and-run-files)
  - [Factories, Services, and Providers](#factories-services-and-providers)

## Installation

via yarn
```
yarn add angular-initializer
```
or via npm
```
npm install --save angular-initializer
```

## Example

Here's what an example entry file might look like:

```js
import { getModuleDeps, initializeExports } from 'angular-initializer'
import * as homePageComponent from './components/home-page'

const ngModule = angular.module('my-app', getModuleDeps(homePageComponent))
// This line registers the homePage component as well as all its injections and so on recursively
initializeExports(ngModule, homePageComponent)
```

And your home-page component:

```js
import * as myFactory from '../factories/my-factory'

// Let angular-initializer know what dependencies this component
// has that also need to be registered with the angular module
export const $deps = [myFactory]

// Perhaps this component uses an external module as a dependency such as angular-bootstrap's modal service
import modal from 'angular-ui-bootstrap/src/modal'
// angular-initializer's `getModuleDeps()` can extract out all external module dependencies in the entry file into
// an array and de-dupe it. This array can be conveniently passed directly to angular when creating a new module.
export const $moduleDeps = [modal]

export const $component = {
  bindings: {},
  controller: controller,
  name: 'homePage'
}

function controller($uibModal, myFactory) {
  // etc...
}
```

## What's it do exactly?

Say you've moved away from concatenating your files with gulp and you've started using something like webpack.
Your bundle's entry file might be setting up your core angular module and requiring all its providers recursively:

```js
import angular from 'angular'
// External module dependency for this app
import datepicker from 'angular-ui-bootstrap/src/datepicker'

angular.module('app.core', ['datepicker'])

// Require all files for a given folder
function requireAll(requireContext) {
	return requireContext.keys().map(value => valu{
		return Object.assign({ filename: value.replace(/^.*[\\\/]/, '').split('.')[0] }, requireContext(value))
	})
}

requireAll(require.context('.', true, /src(\\|\/)components(\\|\/)(?!.*spec\.js$).*\.js$/)),
requireAll(require.context('.', true, /src(\\|\/)factories(\\|\/)(?!.*spec\.js$).*\.js$/)),
```

In `src/component/` you may have declared your components like this:

```js
angular.module('app.core').component('dateRangePicker', {
  controller: controller
  // etc...
})

controller.$inject = ['dateFormat']

function controller(dateFormat) {
  // etc...
}
```

And in `src/factories/` you may have declared your factories like this:

```js
angular.module('app.core').factory('dateFormat', factory)

factory.$inject = []

function factory() {
  // etc...
}
```

Notice a few disadvantages with this setup:
- Each provider (component/factory) needs context awareness of what angular module they belong to
- The module those providers belong to needs to be declared on the global angular instance before the providers are loaded
- The external dependency on ui-bootstrap's datepicker is declared in the entry, so it's not obvious that the dependency is used specifically in components
- There is no way to know which providers depend on each other without following the injection list
- Because of all this, testing the component or factory has become more difficult, requiring mocking all the injections and modules or alternatively building and loading the entire bundle through webpack just to run a unit test

But if we structured things into a dependency tree, we can put the responsibility on each file (ES module) to tell us what it needs and do away with the old angular module concept.

```js
/* components/date-picker.js */

// External module dependency for this component
import datepicker from 'angular-ui-bootstrap/src/datepicker'
export $moduleDeps = [datePicker]

// Injections
import * as dateFormatFactory from '../factories/date-format'
export const $deps = [dateFormatFactory]

export const $component = {
  name: 'dateRangePicker',
  controller: controller
}

function controller(dateFormat) {
  'ngInject' // using angularjs-annotate here to get rid of the redundant $inject array
  // etc...
```


```js
/* factories/date-format.js */
export const $factory = dateFormat() {
  // etc...
}
```

Assuming you declare all the angular filters and child components used by your top level component and so on, then importing the top level component you will import the entire app.

## Caveats

Unlike modern frameworks like Vue or React, you won't get a warning if you declare a directive or component in your template that was never imported/registered. Angular will just not render anything and not give you a warning.
This is something you can only avoid with unit tests, or even better, snapshot tests that will catch when you try to reference a directive you forgot to register.

## Provider API

### Components

You can export the component object directly and provide a `name` property to give the component a name:

```js
export const $component = {
  name: 'myComponentName',
  bindings: {},
  controller,
  template: `<div></div>`,
}

function controller() {}
```

### Directives

Since directives are declared as functions, you export the function directly and the function's `name` property will be use in this case as well:

```js
export const $directive = function myDirectiveName() {
  return {
    link,
    restrict: 'A',
    scope: false
  }

  function link() {}
}
```

### Configs and Run files

Configs and Run files don't have names, but you can still provide a named function to improve the quality of your stack traces.

- `export const $run = function run() {}`
- `export const $config = function config() {}`

### Factories, Services, and Providers

Exporting other providers types you export a named constant with that provider type prefixed with a "$" like so:

- `export const $factory = function myFactoryName(myInjection) {}`
- `export const $service = function myServiceName(myInjection) {}`
- `export const $provider = function myProviderName(myInjection) {}`
