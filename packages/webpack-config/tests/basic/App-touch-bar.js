import Constants from 'expo-constants';
import * as React from 'react';
import { View } from 'react-native';

import * as Menu from './react-menu';
import * as TouchBarItem from './react-touch-bar';

const { Bar: TouchBar } = TouchBarItem;

function AppWindowMenu({ fileItems = [], editItems = [], menuItems = [] }) {
  return (
    <Menu.WindowMenu>
      {/* Menu file (app menu on Mac): includes window controls */}
      <Menu.DefaultFileMenu appName={Constants.manifest.name}>{fileItems}</Menu.DefaultFileMenu>

      {/* Menu edit: includes undo, redo, cut, copy, paste, select all */}
      <Menu.DefaultEditMenu>{editItems}</Menu.DefaultEditMenu>

      {/* Menu view: includes minimize, close, Bring All to Front */}
      <Menu.DefaultWindowMenu>{menuItems}</Menu.DefaultWindowMenu>
    </Menu.WindowMenu>
  );
}

function DemoTBSpacer() {
  const TAB_SPACER_SIZES = ['small', 'large', 'flexible'];
  const [sizeIndex, setSize] = React.useState(0);
  const size = TAB_SPACER_SIZES[sizeIndex % TAB_SPACER_SIZES.length];
  return (
    <TouchBar>
      <TouchBarItem.Button
        label="Next Size"
        onClick={() => {
          console.log('Next size: ', sizeIndex + 1);
          setSize(sizeIndex + 1);
        }}
      />
      <TouchBarItem.Spacer size={size} />
      <TouchBarItem.Label label={size} />
    </TouchBar>
  );
}

const TBNavGroup = ({ props }) => (
  <TouchBarItem.Group>
    <TouchBarItem.Button label="⬅️" onClick={() => props.goBack()} />
    <TouchBarItem.Button label="🏡" onClick={() => props.setLocation('/')} />
    <TouchBarItem.Button label="️➡️" onClick={() => props.goForward()} />
  </TouchBarItem.Group>
);

function DemoTBColorPicker() {
  const colors = ['#3b5998', '#24292e', '#55acee', '#e62117'];
  const [color, setColor] = React.useState(colors[0]);

  // https://developer.apple.com/documentation/appkit/nstouchbar?language=objc
  // Manages inter-item spacing
  // Supports user customization for the individual items
  return (
    <TouchBar clearOnUnmount={false}>
      <TouchBarItem.ColorPicker
        availableColors={colors}
        selectedColor={color}
        onChange={color => setColor(color)}
      />

      <TouchBarItem.Spacer size="flexible" />
      <TBNavGroup />
    </TouchBar>
  );
}

function DemoTBButton() {
  const [first, setFirst] = React.useState(false);
  const [color, setColor] = React.useState(false);
  const [unicorns, setUnicorns] = React.useState(false);
  return (
    <TouchBar clearOnUnmount={false}>
      <TouchBarItem.Button label="Button" onClick={() => setFirst(!first)} />
      <TouchBarItem.Button
        label={color ? 'Red button' : 'Blue Button'}
        backgroundColor={color ? '#e62117' : '#3b5998'}
        onClick={() => setColor(!color)}
      />
      <TouchBarItem.Button
        label="Icon!"
        iconPosition={unicorns ? 'right' : 'left'}
        icon="/assets/tray-icon@2x.png"
        onClick={() => setUnicorns(!unicorns)}
      />

      <TouchBarItem.Spacer size="flexible" />
      <TBNavGroup />
    </TouchBar>
  );
}
function DemoTBGroup() {
  // https://developer.apple.com/documentation/appkit/nstouchbar?language=objc
  // Manages inter-item spacing
  // Supports user customization for the individual items
  const modes = ['single', 'multiple', 'buttons'];
  return (
    <TouchBar clearOnUnmount={false}>
      <TouchBarItem.Group>
        <TouchBarItem.Button label="Button 1" />
        <TouchBarItem.Button label="Button 2" />
      </TouchBarItem.Group>

      <TouchBarItem.Spacer size="flexible" />
      <TBNavGroup />
    </TouchBar>
  );
}

function DemoTBLabel() {
  const colors = ['#3b5998', '#24292e', '#55acee', '#e62117'];

  return (
    <TouchBar clearOnUnmount={false}>
      {colors.map(color => (
        <TouchBarItem.Label key={color} label={color} textColor={color} />
      ))}

      <TouchBarItem.Spacer size="flexible" />
      <TBNavGroup />
    </TouchBar>
  );
}

function DemoTBPopover() {
  return (
    <TouchBar clearOnUnmount={false}>
      <TouchBarItem.Popover label="Popover">
        <TouchBarItem.Button label="Button 1" />
        <TouchBarItem.Button label="Button 2" />
      </TouchBarItem.Popover>

      <TouchBarItem.Popover
        label="Magic Popover"
        icon="/assets/tray-icon@2x.png"
        showCloseButton={false}>
        <TouchBarItem.Button label="Button 1" />
        <TouchBarItem.Button label="Button 2" />
      </TouchBarItem.Popover>
      <TouchBarItem.Spacer size="flexible" />
      <TBNavGroup />
    </TouchBar>
  );
}

function DemoTBScrubber() {
  const items = new Array(30).fill(0);

  return (
    <TouchBar clearOnUnmount={false}>
      <TouchBarItem.Scrubber>
        {items.map((item, index) => (
          <TouchBarItem.ScrubberItem key={index} label={(index + 1).toString()} />
        ))}
      </TouchBarItem.Scrubber>

      <TouchBarItem.Spacer size="flexible" />
      <TBNavGroup />
    </TouchBar>
  );
}

function DemoTBSegmentedControl() {
  const styles = [
    'automatic',
    'rounded',
    'textured-rounded',
    'round-rect',
    'textured-square',
    'capsule',
    'small-square',
    'separated',
  ];

  const modes = ['single', 'multiple', 'buttons'];

  const [style, setStyle] = React.useState(styles[0]);
  const [mode, setMode] = React.useState(modes[0]);

  return (
    <React.Fragment>
      <TouchBar clearOnUnmount={false}>
        <TouchBarItem.SegmentedControl
          segmentStyle={style}
          mode={mode}
          onChange={(selectedIndex: number, isSelected: Boolean) =>
            console.log(selectedIndex, isSelected)
          }>
          <TouchBarItem.Segment label="Segment 1" />
          <TouchBarItem.Segment label="Segment 2" enabled={false} />
          <TouchBarItem.Segment label="Segment 3" icon="/example/static/unicorn@2x.png" />
        </TouchBarItem.SegmentedControl>

        <TouchBarItem.Spacer size="flexible" />
        <TBNavGroup />
      </TouchBar>
      <h1>Segmented Control</h1>

      <label>
        <span>Style:</span>
        <select onChange={ev => setStyle(ev.target.value)}>
          {styles.map(style => (
            <option key={style}>{style}</option>
          ))}
        </select>
      </label>

      <label>
        <span>Mode:</span>
        <select onChange={ev => setMode(ev.target.value)}>
          {modes.map(mode => (
            <option key={mode}>{mode}</option>
          ))}
        </select>
      </label>
    </React.Fragment>
  );
}

function DemoTBSlider() {
  const [sliderValue, setValue] = React.useState(0);

  return (
    <React.Fragment>
      <TouchBar clearOnUnmount={false}>
        <TouchBarItem.Slider
          label="Slider"
          value={sliderValue}
          minValue={0}
          maxValue={100}
          onChange={(sliderValue: number) => setValue(sliderValue)}
        />

        <TouchBarItem.Spacer size="flexible" />
        <TBNavGroup />
      </TouchBar>
      <input
        type="range"
        min={0}
        max={100}
        value={sliderValue}
        onChange={(ev: Object) => setValue(parseInt(ev.target.value, 10))}
      />
    </React.Fragment>
  );
}

export default function App() {
  const [show, setShow] = React.useState(0);

  //       {false && <DemoTBSpacer />}
  //       {true && <DemoTBGroup />}

  const ExampleTB = DemoTBSlider;
  // const ExampleTB = DemoTBSpacer;
  // const ExampleTB = DemoTBSegmentedControl;
  // const ExampleTB = DemoTBScrubber;
  // const ExampleTB = DemoTBPopover;
  // const ExampleTB = DemoTBLabel;
  // const ExampleTB = DemoTBGroup;
  // const ExampleTB = DemoTBButton;
  // const ExampleTB = DemoTBColorPicker;
  return (
    <TouchBarItem.Provider>
      <View style={{ flex: 1 }}>
        <AppWindowMenu />

        <ExampleTB />
      </View>
    </TouchBarItem.Provider>
  );
}
