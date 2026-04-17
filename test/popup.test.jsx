import React, { useRef, useState, useEffect, act } from 'react';
import { render as rtlRender, fireEvent } from '@testing-library/react';
import Overlay from '../src/index';

const { Popup } = Overlay;
const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

const style = {
  width: 200,
  height: 200,
  background: '#999',
  borderRadius: 2,
  boxShadow: '0 3px 6px -4px #0000001f, 0 6px 16px #00000014, 0 9px 28px 8px #0000000d',
};

describe('Popup', () => {
  afterEach(() => {
    document.querySelectorAll('.next-overlay-wrapper').forEach((node) => {
      node.parentNode && node.parentNode.removeChild(node);
    });
  });

  it('renders', async () => {
    const { rerender } = rtlRender(
      <Popup
        overlay={
          <div style={style} id="content" className="content">
            Hello World From Popup!
          </div>
        }
      >
        <button>Open</button>
      </Popup>
    );

    expect(document.querySelectorAll('.content').length).toBe(0);
    expect(document.querySelectorAll('button').length).toBe(1);

    rerender(
      <Popup
        visible
        overlay={
          <div style={style} id="content" className="content">
            Hello World From Popup!
          </div>
        }
      >
        <button>Open</button>
      </Popup>
    );

    expect(document.querySelectorAll('button').length).toBe(1);
    expect(document.querySelectorAll('.content').length).toBe(1);

    rerender(
      <Popup
        visible={false}
        overlay={
          <div style={style} id="content" className="content">
            Hello World From Popup!
          </div>
        }
      >
        <button>Open</button>
      </Popup>
    );

    expect(document.querySelectorAll('.content').length).toBe(0);
  });

  it('should support triggerType=click', async () => {
    rtlRender(
      <Popup
        triggerType="click"
        overlay={
          <div style={style} id="content" className="content">
            Hello World From Popup!
          </div>
        }
      >
        <button>Open</button>
      </Popup>
    );

    expect(document.querySelectorAll('button').length).toBe(1);
    expect(document.querySelectorAll('.content').length).toBe(0);

    const button = document.querySelector('button');
    fireEvent.click(button);

    await delay(50);
    expect(document.querySelectorAll('.content').length).toBe(1);

    act(() => {
      fireEvent.mouseDown(document.body);
    });

    await delay(50);
    expect(document.querySelectorAll('.content').length).toBe(0);
  });

  it('should not call onclose with disabled=true', async () => {
    rtlRender(
      <Popup
        disabled
        triggerType="click"
        overlay={
          <div style={style} id="content" className="content">
            Hello World From Popup!
          </div>
        }
      >
        <button>Open</button>
      </Popup>
    );

    expect(document.querySelectorAll('button').length).toBe(1);
    expect(document.querySelectorAll('.content').length).toBe(0);

    const button = document.querySelector('button');
    fireEvent.click(button);

    await delay(50);
    expect(document.querySelectorAll('.content').length).toBe(0);
  });

  it('should not call onclose with disabled=true and visible=true', async () => {
    rtlRender(
      <Popup
        disabled
        visible
        triggerType="click"
        overlay={
          <div style={style} id="content" className="content">
            Hello World From Popup!
          </div>
        }
      >
        <button>Open</button>
      </Popup>
    );

    expect(document.querySelectorAll('button').length).toBe(1);
    expect(document.querySelectorAll('.content').length).toBe(1);

    const button = document.querySelector('button');
    fireEvent.click(button);

    await delay(50);
    expect(document.querySelectorAll('.content').length).toBe(1);
  });

  it('should support triggerType=focus', async () => {
    rtlRender(
      <Popup
        triggerType="focus"
        overlay={
          <div style={style} id="content" className="content">
            Hello World From Popup!
          </div>
        }
      >
        <button>Open</button>
      </Popup>
    );

    expect(document.querySelectorAll('button').length).toBe(1);
    expect(document.querySelectorAll('.content').length).toBe(0);

    const button = document.querySelector('button');
    fireEvent.focus(button);

    await delay(50);
    expect(document.querySelectorAll('.content').length).toBe(1);

    fireEvent.blur(button);

    await delay(50);
    expect(document.querySelectorAll('.content').length).toBe(0);
  });

  it('should support triggerType=hover', async () => {
    jest.useFakeTimers();

    rtlRender(
      <Popup
        triggerType="hover"
        overlay={
          <div style={style} id="content" className="content">
            Hello World From Popup!
          </div>
        }
      >
        <button>Open</button>
      </Popup>
    );

    expect(document.querySelectorAll('button').length).toBe(1);
    expect(document.querySelectorAll('.content').length).toBe(0);

    const button = document.querySelector('button');
    fireEvent.mouseEnter(button);
    act(() => {
      jest.runAllTimers();
    });

    expect(document.querySelectorAll('.content').length).toBe(1);

    fireEvent.mouseLeave(button);
    act(() => {
      jest.runAllTimers();
    });

    expect(document.querySelectorAll('.content').length).toBe(0);
    jest.useRealTimers();
  });

  it('should placement be bottom', async () => {
    const overlay = (
      <div
        className="next-overlay-inner"
        style={{
          width: '200px',
          height: '200px',
          background: 'red',
        }}
      >
        Hello World From Popup!
      </div>
    );
    rtlRender(
      <Popup visible cache overlay={overlay} placement="b" autoAdjust={false}>
        <button style={{ width: 10, height: 10 }}>click</button>
      </Popup>
    );

    await delay(100);
    expect(document.querySelectorAll('.next-overlay-inner').length).toBe(1);
  });

  it('should support Functional component', async () => {
    const ref = jest.fn();

    const FunctionalButton = (props) => <button {...props}>Open</button>;
    const FunctionalOverlay = React.forwardRef((props, ref) => (
      <div ref={ref} style={style} id="content" className="content">
        Hello World From Popup!
      </div>
    ));
    rtlRender(
      <Popup overlay={<FunctionalOverlay />} ref={ref}>
        <FunctionalButton />
      </Popup>
    );

    expect(document.querySelectorAll('.content').length).toBe(0);
    expect(document.querySelectorAll('button').length).toBe(1);

    const button = document.querySelector('button');
    fireEvent.click(button);

    await delay(50);
    expect(document.querySelectorAll('.content').length).toBe(1);
    expect(ref).toBeCalledTimes(1);
  });

  it('should support target without children(trigger)', async () => {
    const Demo = () => {
      const [visible, setVisible] = useState(false);
      const divref = useRef(null);
      return (
        <>
          <Popup
            target={() => divref.current}
            visible={visible}
            overlay={
              <div style={style} id="content" className="content-nochildren">
                Hello World From Popup!
              </div>
            }
          />
          <button onClick={() => setVisible(true)}>target</button>
          <div ref={divref} style={{ width: 20, height: 20, marginLeft: 100 }} />
        </>
      );
    };

    rtlRender(<Demo />);

    expect(document.querySelectorAll('.content-nochildren').length).toBe(0);
    expect(document.querySelectorAll('button').length).toBe(1);

    const button = document.querySelector('button');
    fireEvent.click(button);

    await delay(50);
    expect(document.querySelectorAll('.content-nochildren').length).toBe(1);
  });

  // 测试环境不支持真实的 dom 渲染，所以 placement 计算没有被调用到
  it.skip('should support dynamic triggger DOM', async (done) => {
    const DyncButton = (props) => {
      const [disabled, setDisabled] = useState(false);

      useEffect(() => {
        setTimeout(() => {
          act(() => {
            setDisabled(false);
          });
        }, 100);
      }, []);

      if (disabled) {
        return (
          <span className="button">
            <button {...props} disabled style={{ width: 80, height: 20 }}>
              Disabled button
            </button>
          </span>
        );
      }

      return (
        <button {...props} className="button" style={{ width: 80, height: 20 }}>
          Open
        </button>
      );
    };

    const beforePosition = (result, info) => {
      expect(info.target).toBe(1);
      done();

      return result;
    };

    rtlRender(
      <Popup
        overlay={
          <div style={style} id="content" className="content">
            Hello World From Popup!
          </div>
        }
        triggerType="click"
        beforePosition={beforePosition}
      >
        <DyncButton />
      </Popup>
    );

    expect(document.querySelectorAll('.content').length).toBe(0);

    const button = document.querySelector('button');
    fireEvent.click(button);
  });
});
