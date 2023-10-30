import { Logo } from '../Logo';
import { Main } from '../Main';

import styles from './Wrapper.module.scss';

export const Wrapper = () => {
  return (
    <div className={styles.root}>
      <div className={styles.backgroundFont}>
        <p>{'tickly '.repeat(3000)}</p>
      </div>
      <Logo />
      <Main />
    </div>
  );
};
