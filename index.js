/*
 * Extract out a set of ngModuleDeps from an array of esModules
 * for creating an angular app module within an entry file.
 * @param {array} esModules array of objects
 * @return a flattened, unique array of angular module dependencies
 */
export function getModuleDeps(esModules) {
	const reduceModuleDeps = (acc, el) => {
		const moduleDeps = el.$moduleDeps || []
		if (el.$deps) {
			return acc.concat(moduleDeps, el.$deps.reduce(reduceModuleDeps, []))
		}
		return acc.concat(moduleDeps)
	}

	return [...new Set(esModules.reduce(reduceModuleDeps, []))]
}

/*
 * Pass it an object with exported angular assets such as a directive
 * or component and it will initialize it for the given module name.
 * @param {string} ngModul angular app module instance
 * @param {object} esModule with named exports
 */
export function initializeExports(ngModule, esModule) {
	// Keep track of what's already been initialized to avoid dupes
	ngModule.initializedProviders = ngModule.initializedProviders || {}

	if (esModule.moduleDeps) {
		throw new Error('You forgot $ prefix when exporting $moduleDeps.')
	}
	// Recurse into the dependencies
	if (esModule.$deps) {
		esModule.$deps.forEach(el => initializeExports(ngModule, el))
	}
	// Prefix with $ to avoid conflicts with non-angular named
	// exports and to make it clear these are angular exports
	['component', 'controller', 'constant', 'directive', 'factory', 'filter', 'provider', 'service', 'value'].forEach(exportKey => {
		const exportData = esModule['$' + exportKey]
		if (esModule[exportKey] && !exportData) {
			throw new Error(`Forgot the $ in named export "$${exportKey}" for asset name "${esModule[exportKey].name}".`)
		}
		if (exportData) {
			// Figure out the provider name
			let name
			if (exportData.name && exportData.name !== '$' + exportKey) {
				name = exportData.name
			} else {
				throw new Error(`Directly importing ${exportKey} but it has no name from which to initialize.`)
			}

			ngModule.initializedProviders[exportKey] = ngModule.initializedProviders[exportKey] || []
			// Initialize the provider, ignoring dupes
			if (!ngModule.initializedProviders[exportKey].includes(name)) {
				ngModule[exportKey](name, exportData)
				ngModule.initializedProviders[exportKey].push(name)
			}
		}
	})

	if (esModule.$config) {
		ngModule.config(esModule.$config)
	}

	if (esModule.$run) {
		ngModule.run(esModule.$run)
	}
}
