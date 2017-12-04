import test from 'ava';
import getAuthUrl from '../lib/get-auth-url';

test('Return the same "repositoryUrl" is no "gitCredentials" is defined', t => {
  t.is(getAuthUrl('', 'git@host.com:owner/repo.git'), 'git@host.com:owner/repo.git');
});

test('Return the "https" formatted URL if "gitCredentials" is defined and repositoryUrl is a "git" URL', t => {
  t.is(getAuthUrl('user:pass', 'git@host.com:owner/repo.git'), 'https://user:pass@host.com/owner/repo.git');
});

test('Return the "https" formatted URL if "gitCredentials" is defined and repositoryUrl is a "https" URL', t => {
  t.is(getAuthUrl('user:pass', 'https://host.com/owner/repo.git'), 'https://user:pass@host.com/owner/repo.git');
});

test('Return the "http" formatted URL if "gitCredentials" is defined and repositoryUrl is a "http" URL', t => {
  t.is(getAuthUrl('user:pass', 'http://host.com/owner/repo.git'), 'http://user:pass@host.com/owner/repo.git');
});

test('Return the "https" formatted URL if "gitCredentials" is defined and repositoryUrl is a "git+https" URL', t => {
  t.is(getAuthUrl('user:pass', 'git+https://host.com/owner/repo.git'), 'https://user:pass@host.com/owner/repo.git');
});

test('Return the "http" formatted URL if "gitCredentials" is defined and repositoryUrl is a "git+http" URL', t => {
  t.is(getAuthUrl('user:pass', 'git+http://host.com/owner/repo.git'), 'http://user:pass@host.com/owner/repo.git');
});
