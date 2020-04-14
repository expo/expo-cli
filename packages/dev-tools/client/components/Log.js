import React from 'react';
import hasAnsi from 'has-ansi';
import { ansiToJson } from 'anser';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Package,
  Smartphone,
} from 'react-feather';

import * as Constants from 'app/common/constants';
import { semanticColors } from 'app/common/colors';
import * as Strings from 'app/common/strings';
import StackTrace from './StackTrace';

const getLogLevelStyles = level => {
  switch (level) {
    case 'DEBUG':
      return {
        containerTint: {
          backgroundColor: semanticColors.defaultLogBackground,
        },
        iconColor: semanticColors.defaultLogIconColor,
        buttonTint: {
          backgroundColor: semanticColors.defaultLogBackground,
        },
      };
    case 'INFO':
      return {
        containerTint: {
          backgroundColor: semanticColors.defaultLogBackground,
        },
        iconColor: semanticColors.defaultLogIconColor,
        buttonTint: {
          backgroundColor: semanticColors.defaultLogBackground,
        },
      };
    case 'WARN':
      return {
        containerTint: {
          backgroundColor: semanticColors.warningLogBackground,
        },
        iconColor: semanticColors.warningLogIconColor,
        buttonTint: {
          backgroundColor: semanticColors.warningLogBackground,
        },
      };
    case 'ERROR':
      return {
        containerTint: {
          backgroundColor: semanticColors.errorLogBackground,
        },
        iconColor: semanticColors.errorLogIconColor,
        buttonTint: {
          backgroundColor: semanticColors.errorLogBackground,
        },
      };
  }
};

const getLogLevelIcon = (level, type) => {
  const color = {
    DEBUG: semanticColors.defaultLogIconColor,
    INFO: semanticColors.defaultLogIconColor,
    WARN: semanticColors.warningLogIconColor,
    ERROR: semanticColors.errorLogIconColor,
  }[level];

  switch (type) {
    case 'Device':
      return <Smartphone color={color} size={16} />;
    case 'Process':
      return <Package color={color} size={16} />;
    case 'Issues':
      return <AlertTriangle color={color} size={16} />;
    case 'ERROR':
      return null;
  }
};

export default class Log extends React.Component {
  state = { collapsed: true };
  renderMessageContent({ msg }) {
    if (!hasAnsi(msg)) {
      return (
        <Text style={styles.logContent}>
          {this.props.name}: {msg}
        </Text>
      );
    }

    return (
      <Text style={styles.logContent}>
        {ansiToJson(msg, {
          remove_empty: true,
        })}
      </Text>
    );
  }

  renderMessage(message) {
    if (message.includesStack) {
      try {
        const data = JSON.parse(message.msg);
        return (
          <View style={styles.stackLogContainer}>
            {this.renderMessageContent({ ...message, msg: data.message })}
            <StackTrace level={message.level} collapsed={this.state.collapsed} stack={data.stack} />
          </View>
        );
      } catch (e) {
        return this.renderMessageContent(message);
      }
    } else {
      return this.renderMessageContent(message);
    }
  }

  render() {
    const { message } = this.props;

    const logLevelStyles = getLogLevelStyles(message.level);
    const logLevelIcon = getLogLevelIcon(message.level, this.props.type);

    return (
      <View style={[styles.container, logLevelStyles.containerTint]}>
        {logLevelIcon && (
          <View
            accessibilityLabel={(message.level?.toLowerCase() ?? '') + ' icon'}
            style={styles.logLevelIconContainer}>
            {logLevelIcon}
          </View>
        )}
        {this.renderMessage(message)}
        <View style={styles.logAccessories}>
          {message.time ? (
            <Text style={styles.logTime}>{Strings.formatTimeMilitary(message.time)}</Text>
          ) : (
            undefined
          )}
          {message.includesStack && (
            <TouchableOpacity
              style={styles.buttonContainer}
              onPress={() => this.setState(s => ({ collapsed: !s.collapsed }))}>
              {this.state.collapsed ? (
                <ChevronDown color="white" size={16} style={{ opacity: 0.6 }} />
              ) : (
                <ChevronUp color="white" size={16} style={{ opacity: 0.6 }} />
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.buttonContainer}
            onPress={() => navigator.clipboard.writeText(message.msg)}>
            <Clipboard color="white" size={16} style={{ opacity: 0.6 }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    padding: 8,
    backgroundColor: semanticColors.defaultLogBackground,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8, // TODO: remove this in favor of spacer component
    alignItems: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  logContent: {
    fontFamily: Constants.fontFamilies.mono,
    width: '100%',
    minWidth: '25%',
    lineHeight: 14,
    fontSize: 12,
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    alignSelf: 'center',
    color: semanticColors.logContent,
  },
  logTime: {
    fontFamily: Constants.fontFamilies.mono,
    color: semanticColors.logContent,
    flexShrink: 0,
    fontSize: 10,
    overflowWrap: 'break-word',
  },
  logAccessories: {
    flexDirection: 'row',
    marginLeft: 16, // TODO: remove this in favor of spacer component
    alignItems: 'center',
  },
  stackLogContainer: { flex: 1, alignSelf: 'center' },
  buttonContainer: {
    marginLeft: 8, // TODO: remove this in favor of spacer component
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 4,
    borderRadius: 2,
    display: 'inline-flex',
  },
  logLevelIconContainer: {
    marginRight: 8, // TODO: remove this in favor of spacer component
    padding: 4,
  },
});
