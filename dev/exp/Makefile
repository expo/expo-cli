release-latest:
	npm version $$VERSION_BUMP
	gulp build
	npm publish

release-next:
	npm version $$VERSION_BUMP
	gulp build
	npm publish --tag next

.PHONY: release-next release-latest
