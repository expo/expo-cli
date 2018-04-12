import * as React from 'react';
import * as Constants from 'app/common/constants';
import * as Strings from 'app/common/strings';
import * as Data from 'app/common/data';
import * as Sets from 'app/common/sets';

import withRedux from 'app/higher-order/withRedux';
import { initStore } from 'app/common/store';

import Root from 'app/components/Root';
import ProjectManager from 'app/components/ProjectManager';

class IndexPage extends React.Component {
  static getInitialProps({ store, isServer }) {
    // NOTE(jim): Server side state update example.
    // TODO(jim): We can kill this once we integrate.
    Data.generateServerSideMockData(store);

    return { isServer };
  }

  async componentDidMount() {
    // NOTE(jim): Clientside state update example.
    // TODO(jim): We can kill this once we integrate.
    Data.generateClientSideMockData(this.props);
  }

  _handleDeviceSelect = ({ id }) => {
    const existingIndex = Sets.findIndex(this.props.devices, id);

    if (this.props.selectedId) {
      const selectedIndex = Sets.findIndex(this.props.devices, this.props.selectedId);
      const swapDevices = Sets.swap(this.props.devices, selectedIndex, existingIndex);

      this.props.dispatch({ type: 'UPDATE', state: { devices: swapDevices, selectedId: id } });
      return;
    }

    const devices = Sets.swap(this.props.devices, 0, existingIndex);
    this.props.dispatch({ type: 'UPDATE', state: { devices, selectedId: id } });
  };

  _handleSectionDrag = ({ oldId, newId }) => {
    const oldIndex = Sets.findIndex(this.props.devices, oldId);
    const newIndex = Sets.findIndex(this.props.devices, newId);
    const devices = Sets.swap(this.props.devices, oldIndex, newIndex);

    this.props.dispatch({ type: 'UPDATE', state: { devices, selectedId: newId } });
  };

  _handleSectionSelect = ({ id }) => {
    this.props.dispatch({ type: 'UPDATE', state: { selectedId: id } });
  };

  _handleSectionDismiss = () => {
    this.props.dispatch({ type: 'UPDATE', state: { selectedId: null } });
  };

  _handleChangeSectionCount = count => {
    this.props.dispatch({ type: 'UPDATE', state: { count } });
  };

  _handleUpdateState = state => {
    this.props.dispatch({ type: 'UPDATE', state });
  };

  _handleSimulatorClickIOS = () => {
    alert('TODO: open IOS simulator');

    // NOTE(jim): Fake adding of a device.
    this.props.dispatch({
      type: 'CONNECT_DEVICE',
      device: {
        id: new Date().getTime(),
        type: 'simulator',
        name: 'IOS Simulator',
        logs: [],
      },
    });
  };

  _handleSimulatorClickAndroid = () => {
    alert('TODO: open Android simulator');

    // NOTE(jim): Fake adding of a device.
    this.props.dispatch({
      type: 'CONNECT_DEVICE',
      device: {
        id: new Date().getTime(),
        type: 'simulator',
        name: 'Android Simulator',
        logs: [],
      },
    });
  };

  render() {
    const renderableSections = [];
    this.props.devices.forEach((s, i) => {
      if (i < this.props.count) {
        renderableSections.push(s);
      }
    });

    return (
      <Root>
        <ProjectManager
          renderableSections={renderableSections}
          sections={this.props.devices}
          count={this.props.count}
          url={this.props.url}
          selectedId={this.props.selectedId}
          isActiveDeviceAndroid={this.props.isActiveDeviceAndroid}
          isActiveDeviceIOS={this.props.isActiveDeviceIOS}
          onSimulatorClickIOS={this._handleSimulatorClickIOS}
          onSimulatorClickAndroid={this._handleSimulatorClickAndroid}
          onChangeSelectionCount={this._handleChangeSectionCount}
          onDeviceSelect={this._handleDeviceSelect}
          onSectionDrag={this._handleSectionDrag}
          onSectionDismiss={this._handleSectionDismiss}
          onSectionSelect={this._handleSectionSelect}
          onUpdateState={this._handleUpdateState}
        />
      </Root>
    );
  }
}

export default withRedux(initStore, state => state)(IndexPage);
