import Image from 'next/image';
import classes from './AnimatedLogo.module.css';

export function AnimatedLogo() {
  return (
    <div className={classes.logoContainer}>
      <Image
        src="/favi3.png"
        alt="Logo"
        width={100}
        height={100}
        className={classes.logo}
      />
    </div>
  );
}