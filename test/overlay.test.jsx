import React, { act } from 'react';
import { render as rtlRender, cleanup, fireEvent } from '@testing-library/react';
import Overlay from '../src/index';

const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

const style = {
  width: 200,
  height: 200,
  background: '#999',
  borderRadius: 2,
  boxShadow: '0 3px 6px -4px #0000001f, 0 6px 16px #00000014, 0 9px 28px 8px #0000000d',
};

describe('Overlay', () => {
  afterEach(async () => {
    await act(async () => {
      cleanup();
    });
    document.querySelectorAll('.next-overlay-wrapper').forEach((node) => {
      if (node.parentNode) node.parentNode.removeChild(node);
    });
  });

  it('renders', async () => {
    const { rerender } = rtlRender(
      <Overlay visible points={['lt', 'tr']}>
        <div style={style} className="content" />
      </Overlay>
    );

    expect(document.querySelectorAll('.content').length).toBe(1);

    rerender(
      <Overlay visible={false} points={['lt', 'tr']}>
        <div style={style} className="content" />
      </Overlay>
    );
    expect(document.querySelectorAll('.content').length).toBe(0);

    rerender(
      <Overlay visible points={['lt', 'tr']}>
        <div style={style} className="content" />
      </Overlay>
    );
    expect(document.querySelectorAll('.content').length).toBe(1);
  });

  it('should support wrapperStyle & wrapperClassname', async () => {
    rtlRender(
      <Overlay visible wrapperClassName="wrapper" wrapperStyle={{ left: 1 }}>
        <div style={style} className="content" />
      </Overlay>
    );

    expect(document.querySelectorAll('.wrapper').length).toBe(1);
    expect(document.querySelector('.wrapper').style.left).toBe('1px');
  });

  it('should support rendering overlay and mask', async () => {
    const { rerender } = rtlRender(
      <Overlay
        visible={false}
        wrapperClassName="next-overlay-wrapper"
        maskClassName="next-overlay-backdrop"
      >
        <div className="content" />
      </Overlay>
    );
    expect(document.querySelectorAll('.next-overlay-wrapper').length).toBe(0);

    rerender(
      <Overlay
        visible
        wrapperClassName="next-overlay-wrapper"
        maskClassName="next-overlay-backdrop"
      >
        <div className="content" />
      </Overlay>
    );

    await delay(50);
    expect(document.querySelectorAll('.next-overlay-wrapper').length).toBe(1);
    expect(document.querySelectorAll('.content').length).toBe(1);
    expect(document.querySelectorAll('.next-overlay-backdrop').length).toBe(0);

    rerender(
      <Overlay
        visible
        hasMask
        wrapperClassName="next-overlay-wrapper"
        maskClassName="next-overlay-backdrop"
      >
        <div className="content" />
      </Overlay>
    );
    await delay(50);

    expect(document.querySelectorAll('.next-overlay-wrapper').length).toBe(1);
    expect(document.querySelectorAll('.content').length).toBe(1);
    expect(document.querySelectorAll('.next-overlay-backdrop').length).toBe(1);
  });

  it('should support canCloseByOutSideClick', async () => {
    const handleClose = jest.fn();

    rtlRender(
      <Overlay visible hasMask={false} canCloseByOutSideClick onRequestClose={handleClose}>
        <div className="content" />
      </Overlay>
    );

    await delay(50);
    expect(document.querySelectorAll('.content').length).toBe(1);
    fireEvent.mouseDown(document.body);
    expect(handleClose).toBeCalledTimes(1);
  });

  it('should support canCloseByOutSideClick by click button', async () => {
    const handleClose = jest.fn();

    rtlRender(
      <div>
        <button>click</button>
        <Overlay visible onRequestClose={handleClose}>
          <div className="content" />
        </Overlay>
      </div>
    );

    await delay(50);
    const button = document.querySelector('button');
    fireEvent.mouseDown(button);
    expect(handleClose).toBeCalledTimes(1);
  });

  it('should support safeNode && canCloseByOutSideClick', async () => {
    const handleClose = jest.fn();
    const ref = React.createRef();

    rtlRender(
      <div>
        <button ref={ref}>click</button>
        <Overlay visible safeNode={() => ref.current} onRequestClose={handleClose}>
          <div className="content" />
        </Overlay>
      </div>
    );

    await delay(50);
    const button = document.querySelector('button');
    fireEvent.mouseDown(button);
    expect(handleClose).toBeCalledTimes(0);
  });

  it('should support canCloseByEsc', async () => {
    const handleClose = jest.fn();

    const { rerender } = rtlRender(
      <Overlay visible canCloseByEsc={false} onRequestClose={handleClose}>
        <div className="content" />
      </Overlay>
    );

    await delay(50);
    expect(document.querySelectorAll('.content').length).toBe(1);
    fireEvent.keyDown(document.body, { keyCode: 27 });
    expect(handleClose).toBeCalledTimes(0);

    rerender(
      <Overlay visible canCloseByEsc onRequestClose={handleClose}>
        <div className="content" />
      </Overlay>
    );
    fireEvent.keyDown(document.body, { keyCode: 27 });
    expect(handleClose).toBeCalledTimes(1);
  });

  const maskStyle = {
    position: 'fixed',
    zIndex: 1001,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,.2)',
  };

  it('should support canCloseByMask', async () => {
    const handleClose = jest.fn();

    const { rerender } = rtlRender(
      <Overlay
        visible
        hasMask
        canCloseByMask={false}
        onRequestClose={handleClose}
        maskClassName="next-overlay-backdrop"
        maskStyle={maskStyle}
      >
        <div className="content" />
      </Overlay>
    );

    await delay(200);
    expect(document.querySelectorAll('.next-overlay-backdrop').length).toBe(1);
    fireEvent.mouseDown(document.querySelector('.next-overlay-backdrop'));
    expect(handleClose).toBeCalledTimes(0);

    rerender(
      <Overlay
        visible
        hasMask
        canCloseByMask
        onRequestClose={handleClose}
        maskClassName="next-overlay-backdrop"
        maskStyle={maskStyle}
      >
        <div className="content" />
      </Overlay>
    );

    fireEvent.mouseDown(document.querySelector('.next-overlay-backdrop'));
    expect(handleClose).toBeCalledTimes(1);
  });

  it('should support cache', async () => {
    const { rerender } = rtlRender(
      <Overlay visible cache>
        <div className="content" />
      </Overlay>
    );

    await delay(50);
    expect(document.querySelectorAll('.content').length).toBe(1);
    rerender(
      <Overlay visible={false} cache>
        <div className="content" />
      </Overlay>
    );
    expect(document.querySelectorAll('.content').length).toBe(1);
  });

  it('should support onOpen & onClose', async () => {
    const onOpen = jest.fn();
    const onClose = jest.fn();

    const { rerender } = rtlRender(
      <Overlay visible onOpen={onOpen} onClose={onClose}>
        <div className="content" />
      </Overlay>
    );

    await delay(50);
    expect(document.querySelectorAll('.content').length).toBe(1);
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(0);

    rerender(
      <Overlay visible={false} onOpen={onOpen} onClose={onClose}>
        <div className="content" />
      </Overlay>
    );
    expect(onClose).toBeCalledTimes(1);
  });

  it('should support onOpen & onClose with cache', async () => {
    const onOpen = jest.fn();
    const onClose = jest.fn();

    const { rerender } = rtlRender(
      <Overlay visible cache onOpen={onOpen} onClose={onClose}>
        <div className="content" />
      </Overlay>
    );

    await delay(50);
    expect(document.querySelectorAll('.content').length).toBe(1);
    expect(onOpen).toBeCalledTimes(1);
    expect(onClose).toBeCalledTimes(0);

    rerender(
      <Overlay visible={false} cache onOpen={onOpen} onClose={onClose}>
        <div className="content" />
      </Overlay>
    );
    expect(onClose).toBeCalledTimes(1);
  });

  it('should support autoFocus', async () => {
    const { rerender } = rtlRender(
      <Overlay autoFocus visible>
        <div className="content">
          <input id="input" />
        </div>
      </Overlay>
    );
    await delay(200);

    expect(document.activeElement).toBe(document.querySelector('input'));
    rerender(
      <Overlay autoFocus visible={false}>
        <div className="content">
          <input id="input" />
        </div>
      </Overlay>
    );
    await delay(200);

    expect(document.activeElement).toBe(document.body);
  });

  it('should propagate click event to parent DOM', async () => {
    const clickHandler = jest.fn();

    rtlRender(
      <div id="overlay-container" onClick={clickHandler}>
        <Overlay visible container={'overlay-container'}>
          <div className="content-element" />
        </Overlay>
      </div>
    );

    await delay(50);
    expect(document.querySelectorAll('.content-element').length).toBe(1);

    fireEvent.click(document.querySelector('.content-element'));
    expect(clickHandler).toBeCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // RefWrapper: React 19 findDOMNode replacement
  //
  // React 19 removed findDOMNode, which used to let Overlay resolve the DOM
  // behind any child (class component / legacy FC / HTML / forwardRef).
  // RefWrapper now branches: forwardRef-compatible children go through
  // cloneElement(ref), others are resolved via LegacyRefBridge (marker span +
  // nextElementSibling). The tests below cover all three paths.
  // ---------------------------------------------------------------------------

  it('RefWrapper fallback: resolves DOM when child is a class component', async () => {
    class LegacyBox extends React.Component {
      render() {
        return (
          <div className="legacy-box" style={{ width: 100, height: 100 }}>
            legacy
          </div>
        );
      }
    }

    const onOpen = jest.fn();

    rtlRender(
      <Overlay visible onOpen={onOpen}>
        <LegacyBox />
      </Overlay>
    );

    await delay(50);

    const dom = document.querySelector('.legacy-box');
    expect(dom).not.toBeNull();
    expect(onOpen).toHaveBeenCalledTimes(1);
    // onOpen receives the real DOM of the class component — same guarantee
    // findDOMNode used to give us on React 17.
    expect(onOpen.mock.calls[0][0]).toBe(dom);
  });

  it('RefWrapper fallback: resolves DOM when child is a plain function component', async () => {
    const PlainBox = ({ children }) => (
      <div className="plain-box" style={{ width: 100, height: 100 }}>
        {children}
      </div>
    );

    const onOpen = jest.fn();

    rtlRender(
      <Overlay visible onOpen={onOpen}>
        <PlainBox>plain</PlainBox>
      </Overlay>
    );

    await delay(50);

    const dom = document.querySelector('.plain-box');
    expect(dom).not.toBeNull();
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen.mock.calls[0][0]).toBe(dom);
  });

  it('RefWrapper transparent path: uses cloneElement for forwardRef children', async () => {
    const FwdBox = React.forwardRef((props, ref) => (
      <div ref={ref} className="fwd-box" style={{ width: 100, height: 100 }}>
        fwd
      </div>
    ));

    const onOpen = jest.fn();

    rtlRender(
      <Overlay visible onOpen={onOpen}>
        <FwdBox />
      </Overlay>
    );

    await delay(50);

    const dom = document.querySelector('.fwd-box');
    expect(dom).not.toBeNull();
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen.mock.calls[0][0]).toBe(dom);
  });
});
