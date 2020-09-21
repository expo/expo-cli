import { Builder } from 'xml2js';

import {
  ExportedConfig,
  PackFileModifierProps,
  PackModifier,
  ProjectFile,
  ProjectFileSystem,
} from '../Config.types';
import { BASE_COLORS_XML } from '../android/Colors';
import { Document, readXMLProjectFileAsync } from '../android/Manifest';
import { withAfter, withModifier } from './withAfter';

export function withDangerousBuildGradle(
  config: ExportedConfig,
  action: PackModifier<PackFileModifierProps<string>>
): ExportedConfig {
  return withAfter(config, 'android', async props => {
    const filePath = Object.keys(props.files).find(
      key => !key.endsWith('app/build.gradle') && key.endsWith('build.gradle')
    );
    if (!filePath || !props.files[filePath]) {
      throw new Error('Failed to find android /build.gradle');
    }

    const file = props.files[filePath];
    const contents = readFileAsString(file);
    const results = await action({ ...props, data: contents });

    props.pushFile(filePath, results.data);

    return {
      ...props,
      ...results,
    };
  });
}

export function withDangerousAppBuildGradle(
  config: ExportedConfig,
  action: PackModifier<PackFileModifierProps<string>>
): ExportedConfig {
  return withAfter(config, 'android', async props => {
    const filePath = Object.keys(props.files).find(key => key.endsWith('app/build.gradle'));
    if (!filePath || !props.files[filePath]) {
      throw new Error('Failed to find android app/build.gradle');
    }

    const file = props.files[filePath];
    const contents = readFileAsString(file);
    const results = await action({ ...props, data: contents });

    props.pushFile(filePath, results.data);

    return {
      ...props,
      ...results,
    };
  });
}

export function withStrings(
  config: ExportedConfig,
  action: PackModifier<PackFileModifierProps<Document>>
): ExportedConfig {
  return withModifier<PackFileModifierProps<Document>>(config, 'android', 'strings', action);
}

export function withDangerousMainActivity(
  config: ExportedConfig,
  action: PackModifier<PackFileModifierProps<string>>
): ExportedConfig {
  return withAfter(config, 'android', async props => {
    const filePath = Object.keys(props.files).find(key => key.endsWith('/MainActivity.java'));
    if (!filePath || !props.files[filePath]) {
      throw new Error('Failed to find android MainActivity.java');
    }

    const file = props.files[filePath];
    const contents = readFileAsString(file);
    const results = await action({ ...props, data: contents });

    props.pushFile(filePath, results.data);

    return {
      ...props,
      ...results,
    };
  });
}

function readFileAsString(file: ProjectFile): string {
  const contents = file.source();
  if (typeof contents === 'string') {
    return contents;
  }
  return contents.toString();
}

export const withOptionalColors = (
  config: ExportedConfig,
  kind: string = 'values',
  action: PackModifier<ProjectFileSystem & { colors: Document; kind: string }>
): ExportedConfig => {
  return withAfter(config, 'android', async props => {
    const colorsKey = `app/src/main/res/${kind}/colors.xml`;
    const colorsFile = props.files[colorsKey];
    if (!colorsFile) {
      return props;
    }

    const colors = await readXMLProjectFileAsync({ file: colorsFile, fallback: BASE_COLORS_XML });

    const results = await action({ ...props, kind, colors });

    props.pushFile(colorsKey, new Builder().buildObject(results.colors));

    return {
      ...props,
      ...results,
    };
  });
};

export const withOptionalStylesColorsPair = (
  config: ExportedConfig,
  kind: string = 'values',
  action: PackModifier<ProjectFileSystem & { styles: Document; colors: Document; kind: string }>
): ExportedConfig => {
  return withAfter(config, 'android', async props => {
    const stylesKey = `app/src/main/res/${kind}/styles.xml`;
    const stylesFile = props.files[stylesKey];

    const colorsKey = `app/src/main/res/${kind}/colors.xml`;
    const colorsFile = props.files[colorsKey];
    if (!stylesFile || !colorsFile) {
      return props;
    }

    const styles = await readXMLProjectFileAsync({ file: stylesFile });
    const colors = await readXMLProjectFileAsync({ file: colorsFile, fallback: BASE_COLORS_XML });

    const results = await action({ ...props, kind, styles, colors });

    props.pushFile(stylesKey, new Builder().buildObject(results.styles));
    props.pushFile(colorsKey, new Builder().buildObject(results.colors));

    return {
      ...props,
      ...results,
    };
  });
};
