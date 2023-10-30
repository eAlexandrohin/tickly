import React from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { CSSTransition } from 'react-transition-group';

import styles from './Main.module.scss';

const dots = '•'.repeat(46);

export const Main = () => {
  let [searchParams] = useSearchParams();
  const obs = searchParams.get('obs');

  const [token, setToken] = React.useState('');
  const [isChange, setIsChange] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);
  const [showBut, setShowBut] = React.useState(false);
  const [hideBut, setHideBut] = React.useState(false);
  const [showPopup, setShowPopup] = React.useState(false);

  React.useEffect(() => {
    try {
      (async () => {
        await fetch('http://localhost:8989/front')
          .then((res) => res.json())
          .then((data) => setToken(`${data.access_token};${data.refresh_token}`));
      })();
    } catch {
      console.error('error when receiving token');
    }
  }, []);

  const onClickInput = () => {
    navigator.clipboard.writeText(token);
    setShowPopup(true);
    setTimeout(() => {
      setShowPopup(false);
    }, 2000);
  };

  const onClickShowBtn = () => {
    setIsVisible(!isVisible);
    setShowBut(false);
  };

  const onClickHideBtn = () => {
    setIsChange(!isChange);
    setHideBut(false);
  };

  const onClickChangeNo = () => {
    setIsChange(false);
  };

  const onClickChangeYes = () => {
    setIsChange(false);
    setIsVisible(true);
  };

  return (
    <>
      <CSSTransition in={showPopup} timeout={500} classNames="alert" unmountOnExit>
        <div className={styles.popup}>Your token has been copied!</div>
      </CSSTransition>
      <div className={styles.root}>
        <div className={styles.yellowBlock}>
          {isChange ? (
            <h2 className={styles.h2change}>Are you sure to unhide the token?</h2>
          ) : (
            <h2 className={styles.h2}>Your auth token:</h2>
          )}
        </div>
        <div className={clsx(styles.purpleBlock, isChange && styles.purpleBlockChange)}>
          {obs ? (
            isChange ? (
              <div className={styles.changeButtons}>
                <button onClick={onClickChangeYes} className={styles.changeButtonYes}>
                  Yes
                </button>
                <button onClick={onClickChangeNo} className={styles.changeButtonNo}>
                  No
                </button>
              </div>
            ) : isVisible ? (
              <>
                <input readOnly type="text" onClick={onClickInput} value={token} />
                <button
                  className={showBut ? styles.buttonHide : styles.buttonShow}
                  onClick={onClickShowBtn}
                  onMouseOver={() => setShowBut(true)}
                  onMouseOut={() => setShowBut(false)}>
                  <img src={showBut ? './img/unshow-icon.png' : './img/view-icon.png'} alt="show" />
                </button>
              </>
            ) : (
              <>
                {/* <input readOnly type="text" onClick={onClickInput} value={dots} /> */}
                <p onClick={onClickInput}>{dots}</p>
                <button
                  className={hideBut ? styles.buttonShow : styles.buttonHide}
                  onClick={onClickHideBtn}
                  onMouseOver={() => setHideBut(true)}
                  onMouseOut={() => setHideBut(false)}>
                  <img src={hideBut ? './img/view-icon.png' : './img/unshow-icon.png'} alt="hire" />
                </button>
              </>
            )
          ) : isVisible ? (
            <>
              <input readOnly type="text" onClick={onClickInput} value={token} />
              <button
                className={showBut ? styles.buttonHide : styles.buttonShow}
                onClick={() => setIsVisible(false)}
                onMouseOver={() => setShowBut(true)}
                onMouseOut={() => setShowBut(false)}>
                <img src={showBut ? './img/unshow-icon.png' : './img/view-icon.png'} alt="show" />
              </button>
            </>
          ) : (
            <>
              {/* <input readOnly type="text" onClick={onClickInput} value={dots} /> */}
              <p onClick={onClickInput}>{dots}</p>
              <button
                className={hideBut ? styles.buttonShow : styles.buttonHide}
                onClick={() => setIsVisible(true)}
                onMouseOver={() => setHideBut(true)}
                onMouseOut={() => setHideBut(false)}>
                <img src={hideBut ? './img/view-icon.png' : './img/unshow-icon.png'} alt="hire" />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};
