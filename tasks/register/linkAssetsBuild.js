module.exports = function (grunt) {
	grunt.registerTask('linkAssetsBuild', [
		'sails-linker:devJsRelative',
		'sails-linker:devJsAppRelative',
		'sails-linker:devStylesRelative',
		'sails-linker:devTpl'
	]);
};