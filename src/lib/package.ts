import walk from 'ignore-walk';
import { basename } from 'path';
import { Languages } from './language';

export const findFilesPath = async (
	path: string = process.cwd(),
	ignoreFiles: string[] = ['.gitignore']
): Promise<string[]> =>
	(
		await walk({
			path,
			ignoreFiles,
			includeEmpty: false,
			follow: true
		})
	).filter(x => !x.startsWith('.git'));

const pathIsMetaCallJson = (path: string): boolean =>
	!!/^metacall(-.+)?\.json$/.exec(basename(path));

export const findMetaCallJsons = (files: string[]): string[] =>
	files.filter(pathIsMetaCallJson);

type LanguageIds = keyof typeof Languages;

export const findRunners = (files: string[]): Set<string> => {
	const runners: Set<string> = new Set<string>();

	for (const file of files) {
		const fileName = basename(file);
		for (const langId of Object.keys(Languages)) {
			const lang = Languages[langId as LanguageIds];
			for (const re of lang.runnerFilesRegexes) {
				if (re.exec(fileName) && lang.runnerName) {
					runners.add(lang.runnerName);
				}
			}
		}
	}

	return runners;
};

export enum PackageError {
	Empty = 'No files found in the current folder',
	JsonNotFound = 'No metacall.json found in the current folder',
	None = 'Package correctly generated'
}

interface PackageDescriptor {
	error: PackageError;
	files: string[];
	jsons: string[];
	runners: string[];
}

const NullPackage: PackageDescriptor = {
	error: PackageError.None,
	files: [],
	jsons: [],
	runners: []
};

export const generatePackage = async (
	path: string = process.cwd()
): Promise<PackageDescriptor> => {
	const files = await findFilesPath(path);

	if (files.length === 0) {
		return { ...NullPackage, error: PackageError.Empty };
	}

	const jsons = findMetaCallJsons(files);

	return {
		error:
			jsons.length === 0 ? PackageError.JsonNotFound : PackageError.None,
		files,
		jsons,
		runners: Array.from(findRunners(files))
	};
};
