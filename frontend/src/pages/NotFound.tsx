import React from 'react';
import { Link } from 'react-router-dom';
import styles from './NotFound.module.css';

export default function NotFound() {
  return (
    <div className={styles.wrap}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>Scene Not Found</h1>
      <p className={styles.sub}>This page doesn't exist in our catalogue.</p>
      <Link to="/" className={styles.btn}>← Back to Home</Link>
    </div>
  );
}
