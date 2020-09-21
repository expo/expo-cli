import { Builder } from 'xml2js';

import {
  AnyAndroidFileResourceModifier,
  ExportedConfig,
  PackFileModifierProps,
  PackModifier,
  ProjectFileSystem,
} from '../Config.types';
import { BASE_COLORS_XML } from '../android/Colors';
import { Document, readXMLProjectFileAsync } from '../android/Manifest';
import { withAfter, withModifier } from './withAfter';

export function withDangerousBuildGradle<
  T extends ProjectFileSystem = PackFileModifierProps<string>
>(config: ExportedConfig, action: PackModifier<T>): ExportedConfig {
  return withModifier<T>(config, 'android', 'dangerousBuildGradle', action);
}
export function withDangerousAppBuildGradle<
  T extends ProjectFileSystem = PackFileModifierProps<string>
>(config: ExportedConfig, action: PackModifier<T>): ExportedConfig {
  return withModifier<T>(config, 'android', 'dangerousAppBuildGradle', action);
}
export function withDangerousMainActivity<
  T extends ProjectFileSystem = PackFileModifierProps<string>
>(config: ExportedConfig, action: PackModifier<T>): ExportedConfig {
  return withModifier<T>(config, 'android', 'dangerousMainActivity', action);
}

export function withStrings<T extends ProjectFileSystem = AnyAndroidFileResourceModifier>(
  config: ExportedConfig,
  action: PackModifier<T>
): ExportedConfig {
  return withModifier<T>(config, 'android', 'strings', action);
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
